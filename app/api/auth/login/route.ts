import { getPrisma } from "@/lib/db";
import { loginSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { serializeUser } from "@/lib/api/serialize";
import { createClient } from "@/lib/supabase/server";
import { cacheAuthenticatedSession } from "@/lib/api/auth";
import { assertLoginAllowed, clearLoginFailures, loginRateKeys, recordLoginFailure } from "@/lib/security/login-rate-limit";
import { isAdminMfaRequired } from "@/lib/env";

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

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: user.authEmail, password: input.password });
    if (error) {
      await recordLoginFailure(rateKeys);
      throw new ApiError(401, "账号或密码错误");
    }
    await clearLoginFailures(rateKeys);
    await cacheAuthenticatedSession(user);
    return ok({ ...serializeUser(user), mfaRequired: user.role === "admin" && isAdminMfaRequired() });
  } catch (error) {
    return handleApiError(error);
  }
}
