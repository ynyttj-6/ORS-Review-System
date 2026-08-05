import "./load-env";

import { productionEnv } from "../lib/env";
import { getPrisma } from "../lib/db";
import { createAdminClient } from "../lib/supabase/admin";

async function main() {
  console.log("[1/4] 检查环境变量...");
  const env = productionEnv();
  console.log("      ✓ 环境变量结构有效（未输出任何密钥）");

  console.log("[2/4] 检查 PostgreSQL...");
  await getPrisma().$queryRaw`SELECT 1`;
  console.log("      ✓ 数据库可连接");

  console.log("[3/4] 检查 Supabase Storage...");
  const { data: bucket, error } = await createAdminClient().storage.getBucket(env.SUPABASE_STORAGE_BUCKET);
  if (error || !bucket) throw new Error(`附件桶不可用：${error?.message || "not found"}`);
  console.log(`      ✓ 私有附件桶 ${env.SUPABASE_STORAGE_BUCKET} 可用`);

  console.log("[4/4] 检查飞书配置...");
  if (env.FEISHU_APP_ID && env.FEISHU_APP_SECRET) console.log("      ✓ 已配置飞书凭据，将在业务事件中发送测试外的真实通知");
  else console.log("      ! 飞书未配置；业务流程可用，通知将记为 skipped");

  await getPrisma().$disconnect();
  console.log("生产接入检查完成。");
}

main().catch(async (error) => {
  console.error("生产接入检查失败：", error instanceof Error ? error.message : error);
  try { await getPrisma().$disconnect(); } catch { /* 环境变量无效时客户端尚未创建 */ }
  process.exit(1);
});
