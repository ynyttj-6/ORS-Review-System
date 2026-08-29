import "./load-env";

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { selfHostedPaths } from "../lib/self-hosted/paths";

type ManifestEntry = { path: string; bytes: number; sha256: string };

async function checksum(filePath: string) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) digest.update(chunk as Buffer);
  return digest.digest("hex");
}

async function filesBelow(root: string) {
  const files: string[] = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop()!;
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.isFile() && entry.name !== "manifest.json") files.push(fullPath);
    }
  }
  return files;
}

function weekKey(date: Date) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  value.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return `${value.getUTCFullYear()}-W${String(Math.ceil((((value.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)).padStart(2, "0")}`;
}

async function pruneBackups(root: string) {
  const candidates = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory() && entry.name.startsWith("ors-")).map((entry) => entry.name).sort().reverse();
  const keep = new Set(candidates.slice(0, 7));
  const weekly = new Set<string>();
  const monthly = new Set<string>();
  for (const name of candidates) {
    const created = new Date(name.slice(4).replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "T$1:$2:$3.$4Z"));
    if (Number.isNaN(created.getTime())) continue;
    const week = weekKey(created);
    if (weekly.size < 4 && !weekly.has(week)) { weekly.add(week); keep.add(name); }
    const month = created.toISOString().slice(0, 7);
    if (monthly.size < 12 && !monthly.has(month)) { monthly.add(month); keep.add(name); }
  }
  for (const name of candidates) if (!keep.has(name)) await rm(path.join(root, name), { recursive: true, force: true });
}

async function main() {
  const paths = selfHostedPaths();
  const database = await stat(paths.databasePath).catch(() => null);
  if (!database?.isFile()) throw new Error(`SQLite 数据库不存在：${paths.databasePath}`);
  const backupRoot = path.resolve(paths.backupDir);
  if (backupRoot === path.parse(backupRoot).root) throw new Error("备份根目录不能是磁盘根目录");
  await mkdir(backupRoot, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(backupRoot, `ors-${stamp}`);
  await mkdir(destination, { recursive: false });

  const source = new Database(paths.databasePath, { readonly: true, fileMustExist: true });
  try {
    await source.backup(path.join(destination, "ors.db"));
  } finally {
    source.close();
  }
  if ((await stat(paths.uploadsDir).catch(() => null))?.isDirectory()) await cp(paths.uploadsDir, path.join(destination, "uploads"), { recursive: true, errorOnExist: true });

  const entries: ManifestEntry[] = [];
  for (const filePath of await filesBelow(destination)) {
    const fileStat = await stat(filePath);
    entries.push({ path: path.relative(destination, filePath).replaceAll("\\", "/"), bytes: fileStat.size, sha256: await checksum(filePath) });
  }
  const manifest = {
    format: 2,
    createdAt: new Date().toISOString(),
    database: "ors.db",
    configuration: {
      appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
      cookieSecure: process.env.ORS_COOKIE_SECURE === "true",
      feishuEnabled: Boolean(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET),
      singleInstance: true,
    },
    entries,
  };
  await writeFile(path.join(destination, "manifest.json"), JSON.stringify(manifest, null, 2), { flag: "wx" });
  await pruneBackups(backupRoot);
  console.log(`一致性备份完成：${destination}`);
  console.log(`文件 ${entries.length} 个，清单 SHA-256 已生成。`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
