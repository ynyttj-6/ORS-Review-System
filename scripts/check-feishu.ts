import "./load-env";

import process from "node:process";

import { getPrisma } from "../lib/db";
import { productionEnv } from "../lib/env";

async function main() {
  const env = productionEnv();
  if (!env.FEISHU_APP_ID || !env.FEISHU_APP_SECRET) {
    throw new Error("FEISHU_APP_ID or FEISHU_APP_SECRET is missing");
  }

  const tokenResponse = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET }),
  });
  const tokenData = await tokenResponse.json() as {
    code: number;
    msg?: string;
    tenant_access_token?: string;
  };
  if (!tokenResponse.ok || tokenData.code !== 0 || !tokenData.tenant_access_token) {
    throw new Error(tokenData.msg || `Feishu token request failed with HTTP ${tokenResponse.status}`);
  }

  const testEmails = [process.env.INVITE_TEST_EMAIL, process.env.OPERATOR_TEST_EMAIL]
    .filter((email): email is string => Boolean(email));
  let emailLookupAvailable = false;
  let resolvedTestRecipientCount = 0;
  let emailLookupError: string | null = null;
  if (testEmails.length > 0) {
    const lookupResponse = await fetch(
      "https://open.feishu.cn/open-apis/contact/v3/users/batch_get_id?user_id_type=open_id",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ emails: testEmails }),
      },
    );
    const lookupData = await lookupResponse.json() as {
      code: number;
      msg?: string;
      data?: { user_list?: Array<{ user_id?: string }> };
    };
    emailLookupAvailable = lookupResponse.ok && lookupData.code === 0;
    resolvedTestRecipientCount = lookupData.data?.user_list?.filter((user) => user.user_id).length ?? 0;
    if (!emailLookupAvailable) emailLookupError = lookupData.msg || `HTTP ${lookupResponse.status}`;
  }

  const [boundUsers, developerUser, operatorUser] = await Promise.all([
    getPrisma().user.findMany({
      where: { isActive: true, feishuUserId: { not: null } },
      select: { role: true },
    }),
    process.env.INVITE_TEST_EMAIL
      ? getPrisma().user.findFirst({
          where: { OR: [{ loginName: process.env.INVITE_TEST_EMAIL }, { authEmail: process.env.INVITE_TEST_EMAIL }] },
          select: { feishuUserId: true },
        })
      : null,
    process.env.OPERATOR_TEST_EMAIL
      ? getPrisma().user.findFirst({
          where: { OR: [{ loginName: process.env.OPERATOR_TEST_EMAIL }, { authEmail: process.env.OPERATOR_TEST_EMAIL }] },
          select: { feishuUserId: true },
        })
      : null,
  ]);
  const boundByRole = boundUsers.reduce<Record<string, number>>((counts, user) => {
    counts[user.role] = (counts[user.role] ?? 0) + 1;
    return counts;
  }, {});

  console.log(JSON.stringify({
    credentialsPresent: true,
    tenantTokenReady: true,
    activeBoundRecipientCount: boundUsers.length,
    boundByRole,
    developerTestRecipientBound: Boolean(developerUser?.feishuUserId),
    operatorTestRecipientBound: Boolean(operatorUser?.feishuUserId),
    emailLookupAvailable,
    resolvedTestRecipientCount,
    emailLookupError,
  }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Feishu configuration check failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getPrisma().$disconnect();
    } catch {
      // The client may not have been created when configuration validation fails.
    }
  });
