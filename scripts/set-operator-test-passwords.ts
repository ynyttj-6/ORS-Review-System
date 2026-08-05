import "./load-env";

import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { getPrisma } from "../lib/db";
import { createAdminClient } from "../lib/supabase/admin";

const targets = [
  { name: "测试开发人员", role: "developer" },
  { name: "测试运营人员2", role: "operator" },
] as const;

async function main() {
  const password = process.env.OPERATOR_TEST_PASSWORD;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!password || password.length < 12 || !appUrl || !url || !publishableKey) throw new Error("测试密码、应用地址或 Supabase 配置无效。");

  const db = getPrisma();
  const users = await db.user.findMany({
    where: { name: { in: targets.map((target) => target.name) } },
    select: { id: true, name: true, loginName: true, authEmail: true, role: true, isActive: true },
  });
  for (const target of targets) {
    const matches = users.filter((user) => user.name === target.name);
    if (matches.length !== 1) throw new Error(`无法唯一定位用户：${target.name}`);
    if (matches[0].role !== target.role) throw new Error(`${target.name} 的角色不符合预期。`);
    if (!matches[0].isActive) throw new Error(`${target.name} 当前已停用，停止修改。`);
  }

  const supabase = createAdminClient();
  const results: Array<{ name: string; passwordUpdated: boolean; directAuthLoginReady: boolean; accountLoginReady: boolean; loginStatus: number; authErrorCode: string | null }> = [];
  for (const target of targets) {
    const user = users.find((candidate) => candidate.name === target.name)!;
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw new Error(`${target.name} 密码更新失败：${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const verificationClient = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: directLogin, error: directLoginError } = await verificationClient.auth.signInWithPassword({ email: user.authEmail, password });
    const loginResponse = await fetch(new URL("/api/auth/login", appUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ account: user.loginName, password }),
    });
    if (directLogin.session) await verificationClient.auth.signOut({ scope: "local" }).catch(() => undefined);
    results.push({ name: target.name, passwordUpdated: true, directAuthLoginReady: Boolean(directLogin.session), accountLoginReady: loginResponse.status === 200, loginStatus: loginResponse.status, authErrorCode: directLoginError?.code ?? null });
  }

  console.log(JSON.stringify({ passwordValueExposed: false, users: results }));
  if (results.some((result) => !result.passwordUpdated || !result.directAuthLoginReady || !result.accountLoginReady)) process.exitCode = 1;
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "测试账号密码设置失败。");
  await getPrisma().$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
