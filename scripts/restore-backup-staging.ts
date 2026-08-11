import "./load-env";

import path from "node:path";
import process from "node:process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import { backupKey, checksum, decryptBackup } from "../lib/backup/crypto";

const TABLES = ["users", "products", "review_rounds", "objections", "attachments", "audit_log", "notification_log"] as const;
const EMPTY_TABLES = [...TABLES, "login_rate_limits"] as const;
type ManifestEntry = { path: string; checksum: string; bytes: number; kind: "table" | "storage" };
type Manifest = { format: number; createdAt: string; storageBucket: string; files: ManifestEntry[] };

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少 ${name}`);
  return value;
}

function supabaseProjectRef(url: string) {
  const hostname = new URL(url).hostname;
  const ref = hostname.split(".")[0];
  if (!ref || ref === "localhost") throw new Error(`无法从 Supabase URL 识别项目引用：${hostname}`);
  return ref;
}

function safeBackupPath(directory: string, relativePath: string) {
  const target = path.resolve(directory, relativePath);
  if (!target.startsWith(`${directory}${path.sep}`)) throw new Error(`备份清单包含非法路径：${relativePath}`);
  return target;
}

async function decryptEntry(directory: string, entry: ManifestEntry, key: Buffer) {
  const encrypted = await readFile(safeBackupPath(directory, entry.path));
  if (encrypted.length !== entry.bytes || checksum(encrypted) !== entry.checksum) throw new Error(`备份校验失败：${entry.path}`);
  return decryptBackup(encrypted, key);
}

function contentType(objectPath: string) {
  const extension = path.extname(objectPath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

async function main() {
  const directoryArg = process.argv[2];
  if (!directoryArg || !path.isAbsolute(directoryArg)) throw new Error("用法：npm run backup:restore:staging -- <备份目录绝对路径>");
  const directory = path.resolve(directoryArg);
  const productionUrl = required("NEXT_PUBLIC_SUPABASE_URL");
  const targetUrl = required("ORS_RESTORE_SUPABASE_URL");
  const targetServiceRole = required("ORS_RESTORE_SUPABASE_SERVICE_ROLE_KEY");
  const targetDatabaseUrl = required("ORS_RESTORE_DATABASE_URL");
  const targetBucket = process.env.ORS_RESTORE_STORAGE_BUCKET?.trim() || "product-attachments";
  const productionRef = supabaseProjectRef(productionUrl);
  const targetRef = supabaseProjectRef(targetUrl);

  if (targetRef === productionRef) throw new Error("安全拒绝：恢复目标与生产 Supabase 项目相同");
  if (!decodeURIComponent(targetDatabaseUrl).includes(targetRef)) throw new Error("安全拒绝：恢复数据库连接与 staging Supabase 项目不匹配");
  const expectedConfirmation = `RESTORE_TO_EMPTY_STAGING:${targetRef}`;
  if (process.env.ORS_RESTORE_CONFIRM !== expectedConfirmation) throw new Error(`安全确认无效；请设置 ORS_RESTORE_CONFIRM=${expectedConfirmation}`);

  const key = backupKey();
  const manifestEncrypted = await readFile(path.join(directory, "manifest.json.enc"));
  const manifest = JSON.parse(decryptBackup(manifestEncrypted, key).toString("utf8")) as Manifest;
  if (manifest.format !== 1 || !Array.isArray(manifest.files)) throw new Error("备份清单格式不受支持");

  const tableEntries = new Map<string, ManifestEntry>();
  const storageEntries: ManifestEntry[] = [];
  for (const entry of manifest.files) {
    const plain = await decryptEntry(directory, entry, key);
    if (entry.kind === "table") {
      const name = path.basename(entry.path, ".json.enc");
      if (!TABLES.includes(name as (typeof TABLES)[number])) throw new Error(`备份包含未知数据表：${name}`);
      if (!Array.isArray(JSON.parse(plain.toString("utf8")))) throw new Error(`数据表备份格式无效：${name}`);
      if (tableEntries.has(name)) throw new Error(`备份包含重复数据表：${name}`);
      tableEntries.set(name, entry);
    } else {
      storageEntries.push(entry);
    }
  }
  for (const table of TABLES) if (!tableEntries.has(table)) throw new Error(`备份缺少数据表：${table}`);

  const storage = createClient(targetUrl, targetServiceRole, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(targetBucket);
  const bucketProbe = await storage.list("", { limit: 1 });
  if (bucketProbe.error) throw new Error(`staging 附件桶不可用：${bucketProbe.error.message}`);
  if ((bucketProbe.data || []).length) throw new Error("安全拒绝：staging 附件桶不是空桶");

  const pool = new Pool({ connectionString: targetDatabaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    for (const table of EMPTY_TABLES) {
      const result = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM public."${table}"`);
      if (result.rows[0]?.count !== "0") throw new Error(`安全拒绝：staging 数据表 ${table} 不是空表`);
    }

    const restoredCounts: Record<string, number> = {};
    await client.query("BEGIN");
    try {
      for (const table of TABLES) {
        const entry = tableEntries.get(table)!;
        const rows = JSON.parse((await decryptEntry(directory, entry, key)).toString("utf8")) as unknown[];
        if (rows.length) {
          await client.query(`INSERT INTO public."${table}" SELECT * FROM json_populate_recordset(NULL::public."${table}", $1::json)`, [JSON.stringify(rows)]);
        }
        restoredCounts[table] = rows.length;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    let restoredObjects = 0;
    for (const entry of storageEntries) {
      if (!entry.path.startsWith("storage/") || !entry.path.endsWith(".enc")) throw new Error(`附件备份路径无效：${entry.path}`);
      const objectPath = entry.path.slice("storage/".length, -".enc".length);
      const plain = await decryptEntry(directory, entry, key);
      const uploaded = await storage.upload(objectPath, plain, { contentType: contentType(objectPath), upsert: false });
      if (uploaded.error) throw new Error(`恢复附件失败 ${objectPath}：${uploaded.error.message}`);
      restoredObjects += 1;
    }

    console.log(`staging 恢复完成：${targetRef}`);
    console.log(`备份创建时间：${manifest.createdAt}`);
    console.log(`数据表记录数：${JSON.stringify(restoredCounts)}`);
    console.log(`附件对象数：${restoredObjects}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "staging 恢复失败");
  process.exitCode = 1;
});
