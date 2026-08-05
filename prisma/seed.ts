import "../scripts/load-env";

import { createAdminClient } from "../lib/supabase/admin";
import { getPrisma } from "../lib/db";

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME || "系统管理员";
  if (!email || !password || password.length < 12) throw new Error("请配置 BOOTSTRAP_ADMIN_EMAIL 和至少 12 位的 BOOTSTRAP_ADMIN_PASSWORD");

  const supabase = createAdminClient();
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  let authUser = list.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role: "admin" } });
    if (error || !data.user) throw error || new Error("创建 Supabase 管理员失败");
    authUser = data.user;
  }
  await getPrisma().user.upsert({
    where: { id: authUser.id },
    update: { name, loginName: email.toLowerCase(), authEmail: email, role: "admin", isActive: true },
    create: { id: authUser.id, name, loginName: email.toLowerCase(), authEmail: email, role: "admin", isActive: true },
  });
  console.log("管理员已就绪（邮箱已隐藏）。");
  await getPrisma().$disconnect();
}

main().catch((error) => { console.error(error); process.exit(1); });
