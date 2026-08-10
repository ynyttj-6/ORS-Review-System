import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { ApiError } from "@/lib/api/response";

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

type RateKey = { key: string; threshold: number };

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function loginRateKeys(request: Request, account: string): RateKey[] {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  const normalizedAccount = account.trim().toLowerCase();
  return [
    { key: digest(`account-ip:${normalizedAccount}:${address}`), threshold: 5 },
    { key: digest(`ip:${address}`), threshold: 30 },
  ];
}

export async function assertLoginAllowed(keys: RateKey[]) {
  const now = new Date();
  const blocked = await getPrisma().loginRateLimit.findFirst({ where: { key: { in: keys.map(({ key }) => key) }, blockedUntil: { gt: now } } });
  if (blocked) throw new ApiError(429, "登录尝试过于频繁，请 15 分钟后再试");
}

export async function recordLoginFailure(keys: RateKey[]) {
  const db = getPrisma();
  const now = new Date();
  const windowBoundary = new Date(now.getTime() - WINDOW_MS);
  const blockedUntil = new Date(now.getTime() + BLOCK_MS);
  await db.$transaction(keys.map(({ key, threshold }) => db.$executeRaw`
    INSERT INTO "login_rate_limits" ("key", "attempts", "window_start", "blocked_until", "updated_at")
    VALUES (${key}, 1, ${now}, NULL, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "login_rate_limits"."window_start" < ${windowBoundary} THEN 1 ELSE "login_rate_limits"."attempts" + 1 END,
      "window_start" = CASE WHEN "login_rate_limits"."window_start" < ${windowBoundary} THEN ${now} ELSE "login_rate_limits"."window_start" END,
      "blocked_until" = CASE
        WHEN (CASE WHEN "login_rate_limits"."window_start" < ${windowBoundary} THEN 1 ELSE "login_rate_limits"."attempts" + 1 END) >= ${threshold} THEN ${blockedUntil}
        ELSE "login_rate_limits"."blocked_until"
      END,
      "updated_at" = ${now}
  `));
}

export async function clearLoginFailures(keys: RateKey[]) {
  await getPrisma().loginRateLimit.deleteMany({ where: { key: { in: keys.map(({ key }) => key) } } });
}
