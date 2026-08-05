import type { Role, User } from "@/lib/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/response";

export async function requireUser(roles?: Role[]): Promise<User> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ApiError(401, "登录已失效，请重新登录");

  const user = await getPrisma().user.findUnique({ where: { id: data.user.id } });
  if (!user || !user.isActive) throw new ApiError(403, "账号未启用或尚未加入系统");
  if (roles && !roles.includes(user.role)) throw new ApiError(403, "当前角色无权执行此操作");
  return user;
}

export function canAccessProduct(user: User, product: { submitterId: string; reviewerId: string | null }) {
  return user.role === "admin" || (user.role === "developer" && product.submitterId === user.id) || (user.role === "operator" && product.reviewerId === user.id);
}
