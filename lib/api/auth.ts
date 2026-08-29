import type { Role, User } from "@/lib/generated/prisma/client";
import { currentSession, revokeUserSessions } from "@/lib/security/session";
import { ApiError } from "@/lib/api/response";

export async function requireUser(roles?: Role[], options?: { allowPasswordChange?: boolean }): Promise<User> {
  const session = await currentSession();
  if (!session) throw new ApiError(401, "登录已失效，请重新登录");
  const user = session.user;
  if (!user.isActive) throw new ApiError(403, "账号未启用或已被停用");
  if (user.mustChangePassword && !options?.allowPasswordChange) throw new ApiError(403, "请先修改管理员发放的临时密码");
  if (roles && !roles.includes(user.role)) throw new ApiError(403, "当前角色无权执行此操作");
  return user;
}

export async function invalidateAuthenticatedUser(userId: string) {
  await revokeUserSessions(userId);
}

export function canAccessProduct(user: User, product: { submitterId: string; reviewerId: string | null }) {
  return user.role === "admin" || (user.role === "developer" && product.submitterId === user.id) || (user.role === "operator" && product.reviewerId === user.id);
}
