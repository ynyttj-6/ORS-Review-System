import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { createUserSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { serializeUser } from "@/lib/api/serialize";
import { hashPassword } from "@/lib/security/password";

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
    const passwordHash = await hashPassword(input.password);
    const user = await getPrisma().user.create({ data: { name: input.name, loginName: input.account, passwordHash, mustChangePassword: true, role: input.role, feishuUserId: input.feishuUserId || null } });
    return ok(serializeUser(user), 201);
  } catch (error) { return handleApiError(error); }
}
