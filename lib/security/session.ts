import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/db";
import { isCookieSecure } from "@/lib/env";

export const SESSION_COOKIE = "ors_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const ACTIVITY_TOUCH_MS = 5 * 60 * 1000;

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(expires: Date) {
  return { httpOnly: true, sameSite: "lax" as const, secure: isCookieSecure(), path: "/", expires };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await getPrisma().session.create({ data: { tokenHash: hashSessionToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const session = await getPrisma().session.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await getPrisma().session.delete({ where: { id: session.id } }).catch(() => undefined);
    (await cookies()).delete(SESSION_COOKIE);
    return null;
  }
  if (Date.now() - session.lastActivityAt.getTime() >= ACTIVITY_TOUCH_MS) {
    await getPrisma().session.update({ where: { id: session.id }, data: { lastActivityAt: new Date() } });
  }
  return session;
}

export async function revokeCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await getPrisma().session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  store.delete(SESSION_COOKIE);
}

export async function revokeUserSessions(userId: string) {
  await getPrisma().session.deleteMany({ where: { userId } });
}
