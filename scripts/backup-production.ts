import "./load-env";

import path from "node:path";
import process from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { getPrisma } from "../lib/db";
import { productionEnv } from "../lib/env";
import { createAdminClient } from "../lib/supabase/admin";
import { backupKey, checksum, encryptBackup } from "../lib/backup/crypto";

const TABLES = ["users", "products", "review_rounds", "objections", "attachments", "audit_log", "notification_log"] as const;
type ManifestFile = { path: string; checksum: string; bytes: number; kind: "table" | "storage" };

function json(value: unknown) {
  return Buffer.from(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item, 2));
}

async function main() {
  const configuredRoot = process.env.ORS_BACKUP_OUTPUT_DIR;
  if (!configuredRoot || !path.isAbsolute(configuredRoot)) throw new Error("ORS_BACKUP_OUTPUT_DIR 必须是仓库外的绝对路径");
  const root = path.resolve(configuredRoot);
  const workspace = path.resolve(process.cwd());
  if (root === workspace || root.startsWith(`${workspace}${path.sep}`)) throw new Error("备份目录不能位于代码仓库内");
  const key = backupKey();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(root, `ors-${stamp}`);
  await mkdir(destination, { recursive: false });

  const files: ManifestFile[] = [];
  const writeEncrypted = async (relativePath: string, content: Buffer, kind: ManifestFile["kind"]) => {
    const target = path.resolve(destination, relativePath);
    if (!target.startsWith(`${destination}${path.sep}`)) throw new Error(`非法备份路径：${relativePath}`);
    await mkdir(path.dirname(target), { recursive: true });
    const encrypted = encryptBackup(content, key);
    await writeFile(target, encrypted, { flag: "wx" });
    files.push({ path: relativePath.replace(/\\/g, "/"), checksum: checksum(encrypted), bytes: encrypted.length, kind });
  };

  const db = getPrisma();
  for (const table of TABLES) {
    const rows = await db.$queryRawUnsafe<unknown[]>(`SELECT * FROM public."${table}"`);
    await writeEncrypted(`database/${table}.json.enc`, json(rows), "table");
  }
  const migrations = await db.$queryRawUnsafe<Array<{ migration_name: string; finished_at: Date | null }>>(`SELECT migration_name, finished_at FROM public."_prisma_migrations" ORDER BY started_at`);

  const env = productionEnv();
  const storage = createAdminClient().storage.from(env.SUPABASE_STORAGE_BUCKET);
  const walk = async (prefix = "") => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await storage.list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error(`读取附件目录失败：${error.message}`);
      for (const item of data || []) {
        const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (!item.id) await walk(objectPath);
        else {
          const downloaded = await storage.download(objectPath);
          if (downloaded.error || !downloaded.data) throw new Error(`下载附件失败 ${objectPath}：${downloaded.error?.message || "empty"}`);
          await writeEncrypted(`storage/${objectPath}.enc`, Buffer.from(await downloaded.data.arrayBuffer()), "storage");
        }
      }
      if (!data || data.length < 1000) break;
    }
  };
  await walk();

  const manifest = {
    format: 1,
    createdAt: new Date().toISOString(),
    databaseMigrations: migrations,
    storageBucket: env.SUPABASE_STORAGE_BUCKET,
    files,
  };
  const encryptedManifest = encryptBackup(json(manifest), key);
  await writeFile(path.join(destination, "manifest.json.enc"), encryptedManifest, { flag: "wx" });
  await db.$disconnect();
  console.log(`加密备份完成：${destination}`);
  console.log(`数据库表 ${TABLES.length} 个，附件 ${files.filter((file) => file.kind === "storage").length} 个。`);
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "生产备份失败");
  await getPrisma().$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
