import { readFile, writeFile } from "node:fs/promises";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const runtimeUrl = process.env.DATABASE_URL;
  if (!runtimeUrl) throw new Error("DATABASE_URL 未配置");
  const url = new URL(runtimeUrl);
  if (!url.hostname.endsWith(".pooler.supabase.com")) {
    throw new Error("DATABASE_URL 不是 Supabase Shared Pooler，无法安全自动转换；请从 Supabase Connect 复制 Session pooler URL");
  }
  url.port = "5432";
  url.searchParams.delete("pgbouncer");
  const envPath = ".env.local";
  const content = await readFile(envPath, "utf8");
  const next = /^DIRECT_URL=.*$/m.test(content)
    ? content.replace(/^DIRECT_URL=.*$/m, `DIRECT_URL=${url.toString()}`)
    : `${content.trimEnd()}\nDIRECT_URL=${url.toString()}\n`;
  await writeFile(envPath, next, "utf8");
  console.log("DIRECT_URL 已切换为 Supavisor Session 模式（5432），未输出连接凭据。");
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
