import "./load-env";

import { randomUUID } from "node:crypto";
import process from "node:process";
import { createServerClient } from "@supabase/ssr";
import { getPrisma } from "../lib/db";
import { createAdminClient } from "../lib/supabase/admin";

type CookieRecord = { name: string; value: string; options?: Record<string, unknown> };

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!url || !publishableKey || !appUrl || !adminEmail || !adminPassword) throw new Error("账号登录检查所需配置不完整。");

  const cookieJar = new Map<string, CookieRecord>();
  const adminSession = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => [...cookieJar.values()],
      setAll: (cookies) => cookies.forEach((cookie) => cookieJar.set(cookie.name, cookie)),
    },
  });
  const { data: adminData, error: adminError } = await adminSession.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (adminError || !adminData.user) throw adminError ?? new Error("无法建立管理员验收会话。");

  const account = `account-check-${Date.now()}`;
  const password = `AccountCheck-${randomUUID()}!Aa1`;
  const changedPassword = `ChangedPassword-${randomUUID()}!Bb2`;
  const cookie = [...cookieJar.values()].map(({ name, value }) => `${name}=${value}`).join("; ");
  let createdId: string | undefined;
  try {
    const createResponse = await fetch(new URL("/api/users", appUrl), {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "账号模式验收", account, password, role: "developer" }),
    });
    const createPayload = await createResponse.json() as { data?: { id: string; account: string }; error?: string };
    if (!createResponse.ok || !createPayload.data) throw new Error(createPayload.error || `创建账号返回 ${createResponse.status}`);
    createdId = createPayload.data.id;

    const loginResponse = await fetch(new URL("/api/auth/login", appUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ account, password }),
    });
    const loginPayload = await loginResponse.json() as { data?: { id: string; account: string }; error?: string };

    const passwordUpdateResponse = await fetch(new URL(`/api/users/${createdId}`, appUrl), {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ password: changedPassword }),
    });
    const oldPasswordLoginResponse = await fetch(new URL("/api/auth/login", appUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ account, password }),
    });
    const changedPasswordLoginResponse = await fetch(new URL("/api/auth/login", appUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ account, password: changedPassword }),
    });
    const changedPasswordPayload = await changedPasswordLoginResponse.json() as { data?: { id: string }; error?: string };
    const loginCookies = changedPasswordLoginResponse.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
    const authenticatedBootstrapResponse = await fetch(new URL("/api/bootstrap", appUrl), { headers: { cookie: loginCookies } });

    const duplicateResponse = await fetch(new URL("/api/users", appUrl), {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "重复账号验收", account: account.toUpperCase(), password, role: "developer" }),
    });
    const selfDeleteResponse = await fetch(new URL(`/api/users/${adminData.user.id}`, appUrl), { method: "DELETE", headers: { cookie } });

    const deleteResponse = await fetch(new URL(`/api/users/${createdId}`, appUrl), {
      method: "DELETE",
      headers: { cookie },
    });
    const loginAfterDeleteResponse = await fetch(new URL("/api/auth/login", appUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ account, password }),
    });
    const [deletedBusinessUser, deletedAuthUser] = await Promise.all([
      getPrisma().user.findUnique({ where: { id: createdId }, select: { id: true } }),
      createAdminClient().auth.admin.getUserById(createdId),
    ]);

    const status = {
      adminCreatedAccountWithoutEmail: createResponse.status === 201 && createPayload.data.account === account,
      accountPasswordLoginReady: loginResponse.status === 200 && loginPayload.data?.id === createdId,
      changedPasswordAccepted: passwordUpdateResponse.status === 200,
      oldPasswordRejected: oldPasswordLoginResponse.status === 401,
      changedPasswordCanLogin: changedPasswordLoginResponse.status === 200 && changedPasswordPayload.data?.id === createdId,
      changedPasswordSessionReady: authenticatedBootstrapResponse.status === 200,
      duplicateAccountDenied: duplicateResponse.status === 409,
      internalEmailHidden: createPayload.data !== undefined && !("email" in createPayload.data),
      currentAdminProtected: selfDeleteResponse.status === 400,
      adminDeletedAccount: deleteResponse.status === 200,
      deletedAccountCannotLogin: loginAfterDeleteResponse.status === 401,
      deletedFromBusinessAndAuth: !deletedBusinessUser && (Boolean(deletedAuthUser.error) || !deletedAuthUser.data.user),
    };
    console.log(JSON.stringify(status));
    if (!Object.values(status).every(Boolean)) process.exitCode = 1;
  } finally {
    if (createdId) {
      const remainingBusinessUser = await getPrisma().user.findUnique({ where: { id: createdId }, select: { id: true } });
      if (remainingBusinessUser) await getPrisma().user.delete({ where: { id: createdId } });
      const authLookup = await createAdminClient().auth.admin.getUserById(createdId);
      if (authLookup.data.user) {
        const { error: cleanupError } = await createAdminClient().auth.admin.deleteUser(createdId);
        if (cleanupError) throw new Error(`临时认证账号清理失败：${cleanupError.message}`);
      }
    }
    await adminSession.auth.signOut({ scope: "local" }).catch(() => undefined);
    await getPrisma().$disconnect().catch(() => undefined);
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "账号登录检查失败。");
  await getPrisma().$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
