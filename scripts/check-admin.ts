import "./load-env";

import process from "node:process";

import { Client } from "pg";

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) throw new Error("缺少 DIRECT_URL。");

  const client = new Client({ connectionString, connectionTimeoutMillis: 10_000 });
  try {
    await client.connect();
    const result = await client.query<{ matched: number; names: string[] }>(`
      select count(u.id)::int as matched,
             coalesce(array_agg(u.name) filter (where u.id is not null), array[]::text[]) as names
      from public.users u
      join auth.users a on a.id = u.id
      where u.role = 'admin'
        and u.is_active = true
        and a.email_confirmed_at is not null
    `);
    const matchedCount = result.rows[0]?.matched ?? 0;
    const names = result.rows[0]?.names ?? [];
    const configuredName = process.env.BOOTSTRAP_ADMIN_NAME ?? "";
    const looksCorrupted = (value: string) => /�|绯荤|缁熺|绠＄|鍛\?/.test(value);
    console.log(JSON.stringify({
      adminReady: matchedCount >= 1,
      matchedCount,
      nameMatchesConfig: Boolean(configuredName) && names.includes(configuredName),
      configuredNameClean: Boolean(configuredName) && !looksCorrupted(configuredName),
      databaseNameClean: names.length > 0 && names.every((name) => !looksCorrupted(name)),
    }));
    if (matchedCount < 1) process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "管理员检查失败。");
  process.exitCode = 1;
});
