import "./load-env";

import process from "node:process";

import { createAdminClient } from "../lib/supabase/admin";

async function main() {
  const operatorMode = process.argv[2] === "operator";
  const email = (operatorMode ? process.env.OPERATOR_TEST_EMAIL : process.env.INVITE_TEST_EMAIL)?.trim().toLowerCase();
  const name = (operatorMode ? process.env.OPERATOR_TEST_NAME : process.env.INVITE_TEST_NAME)?.trim();
  const role = operatorMode ? "operator" : process.env.INVITE_TEST_ROLE;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!email || !name || !role || !appUrl) throw new Error("重新邀请所需配置不完整。");

  const supabase = createAdminClient();
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const existing = listed.users.find((user) => user.email?.toLowerCase() === email);
  if (!existing) throw new Error("测试邀请账号不存在，请先创建邀请。");
  if (existing.email_confirmed_at) throw new Error("测试账号已接受邀请，无需重新发送。");

  const previousSentAt = existing.confirmation_sent_at;
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
    redirectTo: `${appUrl}/login`,
  });
  if (error || !data.user) {
    console.log(JSON.stringify({ resent: false, code: error?.code ?? "invite_failed", status: error?.status ?? 500 }));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({
    resent: true,
    sameUser: data.user.id === existing.id,
    sentAtAdvanced: Boolean(data.user.confirmation_sent_at && data.user.confirmation_sent_at !== previousSentAt),
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "重新邀请失败。");
  process.exitCode = 1;
});
