import type { Role, User } from "@/lib/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { createClient, getSessionFingerprint } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/response";

const USER_CACHE_TTL_MS = 30_000;
const SESSION_CACHE_TTL_MS = 60_000;
const globalForAuth = globalThis as unknown as {
  authenticatedUsers?: Map<string, { user: User; expiresAt: number }>;
  authenticatedSessions?: Map<string, { userId: string; expiresAt: number }>;
};
const authenticatedUsers = globalForAuth.authenticatedUsers ?? new Map<string, { user: User; expiresAt: number }>();
const authenticatedSessions = globalForAuth.authenticatedSessions ?? new Map<string, { userId: string; expiresAt: number }>();
globalForAuth.authenticatedUsers = authenticatedUsers;
globalForAuth.authenticatedSessions = authenticatedSessions;

export function cacheAuthenticatedUser(user: User) {
  authenticatedUsers.set(user.id, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
}

export function invalidateAuthenticatedUser(userId: string) {
  authenticatedUsers.delete(userId);
  authenticatedSessions.forEach((session, fingerprint) => {
    if (session.userId === userId) authenticatedSessions.delete(fingerprint);
  });
}

export async function cacheAuthenticatedSession(user: User) {
  cacheAuthenticatedUser(user);
  const fingerprint = await getSessionFingerprint();
  if (fingerprint) authenticatedSessions.set(fingerprint, { userId: user.id, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
}

function cachedAuthenticatedUser(userId: string) {
  const cached = authenticatedUsers.get(userId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    authenticatedUsers.delete(userId);
    return null;
  }
  return cached.user;
}

function cachedSessionUserId(fingerprint: string | null) {
  if (!fingerprint) return null;
  const cached = authenticatedSessions.get(fingerprint);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    authenticatedSessions.delete(fingerprint);
    return null;
  }
  return cached.userId;
}

export async function requireUser(roles?: Role[]): Promise<User> {
  const initialFingerprint = await getSessionFingerprint();
  let userId = cachedSessionUserId(initialFingerprint);
  if (!userId) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    userId = data?.claims?.sub || null;
    if (error || !userId) throw new ApiError(401, "登录已失效，请重新登录");
    const verifiedFingerprint = await getSessionFingerprint() || initialFingerprint;
    const tokenExpiry = typeof data?.claims?.exp === "number" ? data.claims.exp * 1000 : Date.now() + SESSION_CACHE_TTL_MS;
    if (verifiedFingerprint) authenticatedSessions.set(verifiedFingerprint, { userId, expiresAt: Math.min(Date.now() + SESSION_CACHE_TTL_MS, tokenExpiry) });
  }

  const user = cachedAuthenticatedUser(userId) ?? await getPrisma().user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new ApiError(403, "账号未启用或尚未加入系统");
  cacheAuthenticatedUser(user);
  if (roles && !roles.includes(user.role)) throw new ApiError(403, "当前角色无权执行此操作");
  return user;
}

export function canAccessProduct(user: User, product: { submitterId: string; reviewerId: string | null }) {
  return user.role === "admin" || (user.role === "developer" && product.submitterId === user.id) || (user.role === "operator" && product.reviewerId === user.id);
}
