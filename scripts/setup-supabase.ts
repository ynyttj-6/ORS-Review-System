import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { Client } from "pg";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

dotenv.config({ path: path.join(projectRoot, ".env.local"), override: true, quiet: true });
dotenv.config({ path: path.join(projectRoot, ".env"), override: false, quiet: true });

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("缺少 DIRECT_URL，无法初始化 Supabase。");
}

async function main() {
  const sql = await readFile(path.join(projectRoot, "supabase", "setup.sql"), "utf8");
  const client = new Client({ connectionString, connectionTimeoutMillis: 15_000 });

  try {
    await client.connect();
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("Supabase 存储桶和数据库访问策略初始化完成。");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Supabase 初始化失败。");
  process.exitCode = 1;
});
