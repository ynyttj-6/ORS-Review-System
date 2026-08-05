import "./load-env";

import process from "node:process";

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!url || !publishableKey || !email || !password) {
    throw new Error("登录验证所需配置不完整。");
  }

  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) throw error ?? new Error("登录未返回有效会话。");

  const emailVerified = Boolean(data.user.email_confirmed_at);
  await supabase.auth.signOut({ scope: "local" });
  console.log(JSON.stringify({ loginReady: true, emailVerified, testSessionClosed: true }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "登录验证失败。");
  process.exitCode = 1;
});
