import "./load-env";

import path from "node:path";
import process from "node:process";
import { readFile } from "node:fs/promises";
import { backupKey, checksum, decryptBackup } from "../lib/backup/crypto";

type Manifest = { format: number; createdAt: string; files: Array<{ path: string; checksum: string; bytes: number; kind: "table" | "storage" }> };

async function main() {
  const directoryArg = process.argv[2];
  if (!directoryArg || !path.isAbsolute(directoryArg)) throw new Error("用法：npm run backup:verify -- <备份目录绝对路径>");
  const directory = path.resolve(directoryArg);
  const key = backupKey();
  const manifestData = decryptBackup(await readFile(path.join(directory, "manifest.json.enc")), key);
  const manifest = JSON.parse(manifestData.toString("utf8")) as Manifest;
  if (manifest.format !== 1 || !Array.isArray(manifest.files)) throw new Error("备份清单格式不受支持");

  for (const entry of manifest.files) {
    const target = path.resolve(directory, entry.path);
    if (!target.startsWith(`${directory}${path.sep}`)) throw new Error(`清单包含非法路径：${entry.path}`);
    const encrypted = await readFile(target);
    if (encrypted.length !== entry.bytes || checksum(encrypted) !== entry.checksum) throw new Error(`备份校验失败：${entry.path}`);
    const plain = decryptBackup(encrypted, key);
    if (entry.kind === "table") JSON.parse(plain.toString("utf8"));
  }
  console.log(`备份校验通过：${directory}`);
  console.log(`创建时间 ${manifest.createdAt}，文件 ${manifest.files.length} 个。`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "备份校验失败");
  process.exitCode = 1;
});
