import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { createUserSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { serializeUser } from "@/lib/api/serialize";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireUser(["admin"]);
    const users = await getPrisma().user.findMany({ orderBy: { name: "asc" } });
    return ok(users.map(serializeUser));
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    await requireUser(["admin"]);
    const input = createUserSchema.parse(await request.json());
    const existing = await getPrisma().user.findUnique({ where: { loginName: input.account } });
    if (existing) throw new ApiError(409, "该登录账号已存在");
    const supabase = createAdminClient();
    const authEmail = `ors-${randomUUID()}@example.com`;
    const { data, error } = await supabase.auth.admin.createUser({
      email: authEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name, role: input.role, login_name: input.account },
    });
    if (error || !data.user) throw new ApiError(502, "登录账号创建失败，请稍后重试");
    try {
      const user = await getPrisma().user.create({ data: { id: data.user.id, name: input.name, loginName: input.account, authEmail, role: input.role, feishuUserId: input.feishuUserId || null } });
      return ok(serializeUser(user), 201);
    } catch (error) {
      await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
      throw error;
    }
  } catch (error) { return handleApiError(error); }
}
