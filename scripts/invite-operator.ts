import "./load-env";

import process from "node:process";

import { createServerClient } from "@supabase/ssr";

type CookieRecord = { name: string; value: string; options?: Record<string, unknown> };

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const email = process.env.OPERATOR_TEST_EMAIL;
  const password = process.env.OPERATOR_TEST_PASSWORD;
  const name = process.env.OPERATOR_TEST_NAME;
  if (!url || !publishableKey || !appUrl || !adminEmail || !adminPassword || !email || !password || !name) {
    throw new Error("运营账号创建所需配置不完整。");
  }

  const cookieJar = new Map<string, CookieRecord>();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => [...cookieJar.values()],
      setAll: (cookies) => cookies.forEach((cookie) => cookieJar.set(cookie.name, cookie)),
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (error || !data.session) throw error ?? new Error("无法建立管理员邀请会话。");

  const cookieHeader = [...cookieJar.values()].map(({ name: cookieName, value }) => `${cookieName}=${value}`).join("; ");
  const response = await fetch(new URL("/api/users", appUrl), {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({ name, account: email, password, role: "operator" }),
  });
  await supabase.auth.signOut({ scope: "local" });
  const payload = await response.json().catch(() => null) as { data?: { role?: string; isActive?: boolean }; error?: string } | null;
  const status = {
    created: response.status === 201,
    roleMatched: payload?.data?.role === "operator",
    active: payload?.data?.isActive === true,
    statusCode: response.status,
  };
  console.log(JSON.stringify(status));
  if (!status.created || !status.roleMatched || !status.active) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "运营邀请失败。");
  process.exitCode = 1;
});
