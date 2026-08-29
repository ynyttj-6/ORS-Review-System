import "./load-env";

import { cp, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { selfHostedPaths } from "../lib/self-hosted/paths";
import { verifyBackup } from "./verify-backup";

async function main() {
  const sourceArg = process.argv[2];
  if (!sourceArg || !path.isAbsolute(sourceArg)) throw new Error("用法：npm run backup:restore -- <备份目录绝对路径>");
  if (process.env.ORS_SERVICE_STOPPED !== "true" || process.env.ORS_RESTORE_CONFIRM !== "RESTORE_TO_EMPTY_DATA_DIR") throw new Error("恢复前必须停止服务，并设置 ORS_SERVICE_STOPPED=true、ORS_RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATA_DIR");
  const source = path.resolve(sourceArg);
  await verifyBackup(source);
  const paths = selfHostedPaths();
  await mkdir(paths.dataDir, { recursive: true });
  const existing = (await readdir(paths.dataDir)).filter((name) => !["tmp"].includes(name));
  if (existing.length) throw new Error(`恢复目标必须为空：${paths.dataDir}`);
  const sourceDatabase = path.join(source, "ors.db");
  if (!(await stat(sourceDatabase)).isFile()) throw new Error("备份数据库不存在");
  await cp(sourceDatabase, paths.databasePath, { errorOnExist: true });
  const sourceUploads = path.join(source, "uploads");
  if ((await stat(sourceUploads).catch(() => null))?.isDirectory()) await cp(sourceUploads, paths.uploadsDir, { recursive: true, errorOnExist: true });
  console.log(`恢复完成：${paths.dataDir}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
