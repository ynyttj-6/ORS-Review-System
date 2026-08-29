import { getPrisma } from "@/lib/db";
import { loginSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { serializeUser } from "@/lib/api/serialize";
import { assertLoginAllowed, clearLoginFailures, loginRateKeys, recordLoginFailure } from "@/lib/security/login-rate-limit";
import { verifyPassword } from "@/lib/security/password";
import { createSession, revokeUserSessions } from "@/lib/security/session";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const rateKeys = loginRateKeys(request, input.account);
    await assertLoginAllowed(rateKeys);
    const user = await getPrisma().user.findUnique({ where: { loginName: input.account } });
    if (!user || !user.isActive) {
      await recordLoginFailure(rateKeys);
      throw new ApiError(401, "账号或密码错误");
    }

    if (!await verifyPassword(input.password, user.passwordHash)) {
      await recordLoginFailure(rateKeys);
      throw new ApiError(401, "账号或密码错误");
    }
    await clearLoginFailures(rateKeys);
    await revokeUserSessions(user.id);
    await createSession(user.id);
    return ok({ ...serializeUser(user), mustChangePassword: user.mustChangePassword });
  } catch (error) {
    return handleApiError(error);
  }
}
