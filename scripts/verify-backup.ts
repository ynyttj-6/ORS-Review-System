import "./load-env";

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

type Manifest = { format: number; database: string; entries: Array<{ path: string; bytes: number; sha256: string }> };

async function checksum(filePath: string) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) digest.update(chunk as Buffer);
  return digest.digest("hex");
}

export async function verifyBackup(directory: string) {
  const root = path.resolve(directory);
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8")) as Manifest;
  if (manifest.format !== 2 || !Array.isArray(manifest.entries)) throw new Error("备份清单格式不受支持");
  for (const entry of manifest.entries) {
    const target = path.resolve(root, entry.path);
    if (!target.startsWith(`${root}${path.sep}`)) throw new Error(`备份清单包含非法路径：${entry.path}`);
    const fileStat = await stat(target);
    if (!fileStat.isFile() || fileStat.size !== entry.bytes || await checksum(target) !== entry.sha256) throw new Error(`备份校验失败：${entry.path}`);
  }
  const databasePath = path.resolve(root, manifest.database);
  if (!databasePath.startsWith(`${root}${path.sep}`)) throw new Error("数据库备份路径非法");
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const result = database.pragma("integrity_check") as Array<{ integrity_check: string }>;
    if (result[0]?.integrity_check !== "ok") throw new Error(`SQLite 完整性检查失败：${JSON.stringify(result)}`);
  } finally { database.close(); }
  return manifest;
}

async function main() {
  const directory = process.argv[2];
  if (!directory || !path.isAbsolute(directory)) throw new Error("用法：npm run backup:verify -- <备份目录绝对路径>");
  const manifest = await verifyBackup(directory);
  console.log(`备份校验通过：${path.resolve(directory)}（${manifest.entries.length} 个文件）`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
