import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { changePasswordSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { createSession } from "@/lib/security/session";

export async function POST(request: Request) {
  try {
    const user = await requireUser(undefined, { allowPasswordChange: true });
    const input = changePasswordSchema.parse(await request.json());
    if (!user.mustChangePassword && (!input.currentPassword || !await verifyPassword(input.currentPassword, user.passwordHash))) throw new ApiError(400, "当前密码不正确");
    if (await verifyPassword(input.newPassword, user.passwordHash)) throw new ApiError(400, "新密码不能与当前密码相同");
    const passwordHash = await hashPassword(input.newPassword);
    await getPrisma().$transaction([
      getPrisma().user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date() } }),
      getPrisma().session.deleteMany({ where: { userId: user.id } }),
    ]);
    await createSession(user.id);
    return ok({ changed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
