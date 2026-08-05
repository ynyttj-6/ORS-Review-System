import "./load-env";

import process from "node:process";

import { Client } from "pg";

async function main() {
  const connectionString = process.env.DIRECT_URL;
  const email = process.env.INVITE_TEST_EMAIL?.trim().toLowerCase();
  const expectedRole = process.env.INVITE_TEST_ROLE;
  if (!connectionString || !email || !expectedRole) throw new Error("邀请检查所需配置不完整。");

  const client = new Client({ connectionString, connectionTimeoutMillis: 10_000 });
  try {
    await client.connect();
    const result = await client.query<{
      role: string;
      is_active: boolean;
      invited: boolean;
      confirmed: boolean;
    }>(`
      select u.role,
             u.is_active,
             a.invited_at is not null as invited,
             a.email_confirmed_at is not null as confirmed
      from public.users u
      join auth.users a on a.id = u.id
      where lower(u.email) = $1
    `, [email]);

    const row = result.rows[0];
    const status = {
      recordReady: result.rowCount === 1,
      roleMatches: row?.role === expectedRole,
      active: row?.is_active === true,
      inviteCreated: row?.invited === true,
      awaitingAcceptance: row?.confirmed === false,
    };
    console.log(JSON.stringify(status));
    if (!Object.values(status).every(Boolean)) process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "邀请检查失败。");
  process.exitCode = 1;
});
