import "./load-env";

import process from "node:process";

import { createClient } from "@supabase/supabase-js";

import { getPrisma } from "../lib/db";

async function main() {
  const operatorMode = process.argv[2] === "operator";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = operatorMode ? process.env.OPERATOR_TEST_EMAIL : process.env.INVITE_TEST_EMAIL;
  const password = operatorMode ? process.env.OPERATOR_TEST_PASSWORD : process.env.INVITE_TEST_PASSWORD;
  const expectedRole = operatorMode ? "operator" : process.env.INVITE_TEST_ROLE;
  if (!url || !publishableKey || !email || !password || !expectedRole) {
    throw new Error("测试账号验证所需配置不完整。");
  }

  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) throw error ?? new Error("测试账号登录未返回有效会话。");

  const businessUser = await getPrisma().user.findUnique({
    where: { id: data.user.id },
    select: { role: true, isActive: true },
  });
  const status = {
    loginReady: true,
    emailVerified: Boolean(data.user.email_confirmed_at),
    businessRecordMatched: Boolean(businessUser),
    roleMatched: businessUser?.role === expectedRole,
    active: businessUser?.isActive === true,
    testSessionClosed: true,
  };

  await supabase.auth.signOut({ scope: "local" });
  await getPrisma().$disconnect();
  console.log(JSON.stringify(status));
  if (!Object.values(status).every(Boolean)) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "测试账号验证失败。");
  try { await getPrisma().$disconnect(); } catch { /* 客户端可能尚未创建 */ }
  process.exitCode = 1;
});
