import { getPrisma } from "@/lib/db";
import { loginSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { serializeUser } from "@/lib/api/serialize";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await getPrisma().user.findUnique({ where: { loginName: input.account } });
    if (!user) throw new ApiError(401, "账号或密码错误");
    if (!user.isActive) throw new ApiError(403, "账号已停用，请联系管理员");

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: user.authEmail, password: input.password });
    if (error) throw new ApiError(401, "账号或密码错误");
    return ok(serializeUser(user));
  } catch (error) {
    return handleApiError(error);
  }
}
