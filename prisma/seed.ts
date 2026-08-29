import "../scripts/load-env";

import { getPrisma } from "../lib/db";
import { hashPassword } from "../lib/security/password";

async function main() {
  const account = process.env.BOOTSTRAP_ADMIN_ACCOUNT || process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME || "系统管理员";
  if (!account || !password || password.length < 12) throw new Error("请配置 BOOTSTRAP_ADMIN_ACCOUNT 和至少 12 位的 BOOTSTRAP_ADMIN_PASSWORD");
  const loginName = account.toLowerCase();
  const passwordHash = await hashPassword(password);
  await getPrisma().user.upsert({
    where: { loginName },
    update: { name, role: "admin", isActive: true },
    create: { name, loginName, passwordHash, role: "admin", isActive: true, mustChangePassword: true },
  });
  console.log("本地管理员已就绪；首次登录后必须修改临时密码。");
  await getPrisma().$disconnect();
}

main().catch((error) => { console.error(error); process.exit(1); });
