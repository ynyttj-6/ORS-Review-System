import "./load-env";

import process from "node:process";

import { createServerClient } from "@supabase/ssr";

type CookieRecord = { name: string; value: string; options?: Record<string, unknown> };

async function main() {
  const operatorMode = process.argv[2] === "operator";
  const productCode = process.argv[3];
  const expectedProductStatus = process.argv[4];
  const expectedReviewTime = process.argv[5];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const email = operatorMode ? process.env.OPERATOR_TEST_EMAIL : process.env.INVITE_TEST_EMAIL;
  const password = operatorMode ? process.env.OPERATOR_TEST_PASSWORD : process.env.INVITE_TEST_PASSWORD;
  const expectedRole = operatorMode ? "operator" : "developer";
  if (!url || !publishableKey || !appUrl || !email || !password) {
    throw new Error("RBAC 检查所需配置不完整。");
  }

  const cookieJar = new Map<string, CookieRecord>();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => [...cookieJar.values()],
      setAll: (cookies) => cookies.forEach((cookie) => cookieJar.set(cookie.name, cookie)),
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) throw error ?? new Error("无法建立角色测试会话。");

  const cookieHeader = [...cookieJar.values()].map(({ name, value }) => `${name}=${value}`).join("; ");
  const request = (path: string, init: RequestInit = {}) => fetch(new URL(path, appUrl), {
    ...init,
    headers: { ...init.headers, cookie: cookieHeader },
  });
  const [usersResponse, productsResponse, bootstrapResponse, notificationsResponse, notificationsPageResponse, passwordUpdateResponse, userDeleteResponse, productCreateResponse] = await Promise.all([
    request("/api/users"),
    request("/api/products"),
    request("/api/bootstrap"),
    request("/api/notifications?page=1&pageSize=10"),
    request("/notifications"),
    request(`/api/users/${data.user.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "UnauthorizedPassword123!" }) }),
    request(`/api/users/${data.user.id}`, { method: "DELETE" }),
    operatorMode
      ? request("/api/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) })
      : Promise.resolve(null),
  ]);
  const bootstrap = await bootstrapResponse.json() as {
    data?: {
      currentUser?: { id: string; name: string; role: string };
      users?: Array<{ id: string; account: string }>;
      notices?: Array<{ time: string }>;
    };
  };
  const productsPayload = await productsResponse.json() as {
    data?: Array<{
      code: string;
      status: string;
      reviews?: Array<{ decision: string; comment: string; createdAt: string }>;
    }>;
  };
  const notificationsPayload = await notificationsResponse.json() as {
    data?: { items?: Array<{ target: string; status: string; time: string }>; total?: number };
  };
  const currentUser = bootstrap.data?.currentUser;
  const visibleUsers = bootstrap.data?.users ?? [];
  const foreignUsers = visibleUsers.filter((user) => user.id !== currentUser?.id);
  const foreignUsersWithAccount = foreignUsers.filter((user) => user.account !== "");
  const linkedAccountsProtected = foreignUsersWithAccount.length === 0;
  const targetProduct = productCode
    ? productsPayload.data?.find((product) => product.code === productCode)
    : undefined;
  const targetLatestReview = targetProduct?.reviews?.at(-1);
  const targetProductVisible = !productCode || Boolean(targetProduct);
  const targetStatusMatched = !expectedProductStatus || targetProduct?.status === expectedProductStatus;
  const targetReviewVisible = !productCode || Boolean(targetLatestReview?.comment);
  const targetReviewTimeMatched = !expectedReviewTime || targetLatestReview?.createdAt === expectedReviewTime;
  const latestNoticeTime = bootstrap.data?.notices?.[0]?.time ?? null;
  const notificationItems = notificationsPayload.data?.items ?? [];
  const notificationTargetsProtected = notificationItems.every((item) => item.target === currentUser?.name);

  const status = {
    roleSessionReady: true,
    adminUsersEndpointDenied: usersResponse.status === 403,
    roleProductsEndpointAllowed: productsResponse.status === 200,
    roleNotificationsEndpointAllowed: notificationsResponse.status === 200,
    roleNotificationsPageAllowed: notificationsPageResponse.status === 200,
    rolePasswordUpdateDenied: passwordUpdateResponse.status === 403,
    roleUserDeleteDenied: userDeleteResponse.status === 403,
    bootstrapAllowed: bootstrapResponse.status === 200,
    expectedRoleConfirmed: currentUser?.role === expectedRole,
    operatorProductCreateDenied: !operatorMode || productCreateResponse?.status === 403,
    linkedAccountsProtected,
    targetProductVisible,
    targetStatusMatched,
    targetReviewVisible,
    targetReviewTimeMatched,
    targetProductStatus: targetProduct?.status ?? null,
    targetReviewDecision: targetLatestReview?.decision ?? null,
    targetReviewTime: targetLatestReview?.createdAt ?? null,
    latestNoticeTime,
    notificationTargetsProtected,
    visibleNotificationCount: notificationItems.length,
    visibleUserCount: visibleUsers.length,
    foreignUserCount: foreignUsers.length,
    foreignUsersWithAccountCount: foreignUsersWithAccount.length,
  };
  await supabase.auth.signOut({ scope: "local" });
  console.log(JSON.stringify(status));
  if (!status.roleSessionReady || !status.adminUsersEndpointDenied || !status.roleProductsEndpointAllowed
      || !status.roleNotificationsEndpointAllowed || !status.roleNotificationsPageAllowed || !status.rolePasswordUpdateDenied || !status.roleUserDeleteDenied || !status.bootstrapAllowed || !status.expectedRoleConfirmed || !status.operatorProductCreateDenied
      || !status.linkedAccountsProtected || !status.targetProductVisible || !status.targetStatusMatched
      || !status.targetReviewVisible || !status.targetReviewTimeMatched || !status.notificationTargetsProtected) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "RBAC 检查失败。");
  process.exitCode = 1;
});
