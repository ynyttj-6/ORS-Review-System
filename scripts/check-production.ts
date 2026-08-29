import "./load-env";

import { access, statfs } from "node:fs/promises";
import { getPrisma } from "../lib/db";
import { selfHostedPaths } from "../lib/self-hosted/paths";

async function main() {
  const paths = selfHostedPaths();
  console.log("[1/4] 检查 SQLite 与 PRAGMA...");
  const [integrity] = await getPrisma().$queryRawUnsafe<Array<{ integrity_check: string }>>("PRAGMA integrity_check");
  if (integrity?.integrity_check !== "ok") throw new Error("SQLite 完整性检查未通过");
  const [[journal], [foreignKeys], [busyTimeout], [synchronous]] = await Promise.all([
    getPrisma().$queryRawUnsafe<Array<{ journal_mode: string }>>("PRAGMA journal_mode"),
    getPrisma().$queryRawUnsafe<Array<{ foreign_keys: bigint }>>("PRAGMA foreign_keys"),
    getPrisma().$queryRawUnsafe<Array<{ timeout: bigint }>>("PRAGMA busy_timeout"),
    getPrisma().$queryRawUnsafe<Array<{ synchronous: bigint }>>("PRAGMA synchronous"),
  ]);
  if (journal?.journal_mode.toLowerCase() !== "wal" || Number(foreignKeys?.foreign_keys) !== 1 || Number(busyTimeout?.timeout) < 5000 || Number(synchronous?.synchronous) !== 1) throw new Error("SQLite PRAGMA 未按自托管基线生效");
  console.log("      ✓ 完整性正常，WAL/外键/5秒忙等待/NORMAL 同步均已启用");
  console.log("[2/4] 检查本机数据目录...");
  await access(paths.dataDir);
  const disk = await statfs(paths.dataDir);
  console.log(`      ✓ 数据目录可访问，剩余 ${Math.round(Number(disk.bavail * disk.bsize) / 1024 ** 3)} GB`);
  console.log("[3/4] 检查飞书可选配置...");
  console.log(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET ? "      ✓ 已配置飞书通知" : "      ✓ 飞书未配置，站内通知仍正常记录");
  console.log("[4/4] 检查单实例约束...");
  if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== "0") throw new Error("检测到多实例配置；SQLite 部署只允许单实例");
  console.log("      ✓ 未检测到多实例配置");
  await getPrisma().$disconnect();
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
