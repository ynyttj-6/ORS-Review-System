import "./load-env";

import { productionEnv } from "../lib/env";
import { getPrisma } from "../lib/db";
import { createAdminClient } from "../lib/supabase/admin";

async function main() {
  const blockers: string[] = [];
  console.log("[1/7] 检查环境变量...");
  const env = productionEnv();
  console.log("      ✓ 环境变量结构有效（未输出任何密钥）");
  if (env.PRODUCTION_READINESS_STRICT === "true" && !env.NEXT_PUBLIC_APP_URL.startsWith("https://")) blockers.push("正式地址必须使用 HTTPS");

  console.log("[2/7] 检查 PostgreSQL...");
  await getPrisma().$queryRaw`SELECT 1`;
  console.log("      ✓ 数据库可连接");

  console.log("[3/7] 检查 Supabase Storage...");
  const { data: bucket, error } = await createAdminClient().storage.getBucket(env.SUPABASE_STORAGE_BUCKET);
  if (error || !bucket) throw new Error(`附件桶不可用：${error?.message || "not found"}`);
  console.log(`      ✓ 私有附件桶 ${env.SUPABASE_STORAGE_BUCKET} 可用`);

  console.log("[4/7] 检查飞书配置...");
  if (env.FEISHU_APP_ID && env.FEISHU_APP_SECRET) console.log("      ✓ 已配置飞书凭据，将在业务事件中发送测试外的真实通知");
  else console.log("      ! 飞书未配置；业务流程可用，通知将记为 skipped");

  console.log("[5/7] 检查管理员 MFA 门禁...");
  if (env.NEXT_PUBLIC_REQUIRE_ADMIN_MFA === "true") console.log("      ✓ 已强制管理员使用 TOTP 双重验证");
  else { console.log("      ! 管理员 MFA 尚未强制启用"); blockers.push("管理员 MFA 尚未强制启用"); }

  console.log("[6/7] 检查企业 SMTP...");
  if (env.AUTH_CUSTOM_SMTP_CONFIGURED === "true") console.log("      ✓ 已确认 Supabase Auth 使用企业 SMTP");
  else { console.log("      ! 尚未确认企业 SMTP"); blockers.push("企业 SMTP 尚未确认"); }

  console.log("[7/7] 检查备份策略...");
  if (env.BACKUP_POLICY_CONFIGURED === "true") console.log("      ✓ 已确认数据库与附件备份策略");
  else { console.log("      ! 尚未确认备份策略与恢复演练"); blockers.push("备份策略尚未确认"); }

  await getPrisma().$disconnect();
  if (env.PRODUCTION_READINESS_STRICT === "true" && blockers.length) throw new Error(`严格上线检查未通过：${blockers.join("；")}`);
  if (blockers.length) console.log(`当前为宽松检查，仍有 ${blockers.length} 个上线阻断项。正式部署前请设置 PRODUCTION_READINESS_STRICT=true。`);
  console.log("生产接入检查完成。");
}

main().catch(async (error) => {
  console.error("生产接入检查失败：", error instanceof Error ? error.message : error);
  try { await getPrisma().$disconnect(); } catch { /* 环境变量无效时客户端尚未创建 */ }
  process.exit(1);
});
