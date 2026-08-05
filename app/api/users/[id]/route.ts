import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { updateUserSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { serializeUser } from "@/lib/api/serialize";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireUser(["admin"]);
    const { id } = await params;
    const input = updateUserSchema.parse(await request.json());
    if (id === admin.id && input.isActive === false) throw new ApiError(400, "不能停用当前登录账号");
    const existing = await getPrisma().user.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "用户不存在");

    const { password, account, ...restInput } = input;
    if (account) {
      const conflict = await getPrisma().user.findFirst({ where: { loginName: account, id: { not: id } }, select: { id: true } });
      if (conflict) throw new ApiError(409, "该登录账号已存在");
    }
    const profileInput = { ...restInput, ...(account ? { loginName: account } : {}) };
    if (password) {
      const { error } = await createAdminClient().auth.admin.updateUserById(id, { password, email_confirm: true });
      if (error) throw new ApiError(502, "登录密码更新失败，请稍后重试");
    }

    const user = Object.keys(profileInput).length
      ? await getPrisma().user.update({
          where: { id },
          data: {
            ...profileInput,
            ...(profileInput.feishuUserId !== undefined
              ? { feishuUserId: profileInput.feishuUserId || null }
              : {}),
          },
        })
      : existing;
    return ok(serializeUser(user));
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireUser(["admin"]);
    const { id } = await params;
    if (id === admin.id) throw new ApiError(400, "不能删除当前登录管理员账号");

    const db = getPrisma();
    const user = await db.user.findUnique({
      where: { id },
      include: {
        _count: { select: { submissions: true, assignments: true, reviews: true, objections: true, auditLogs: true, uploads: true } },
      },
    });
    if (!user) throw new ApiError(404, "用户不存在");
    const relatedRecords = Object.values(user._count).reduce((total, count) => total + count, 0);
    if (relatedRecords > 0) throw new ApiError(409, "该用户已有业务或审计记录，不能永久删除；请改为停用账号");

    const { error } = await createAdminClient().auth.admin.deleteUser(id);
    const authUserMissing = error?.message.toLowerCase().includes("not found");
    if (error && !authUserMissing) throw new ApiError(502, "认证账号删除失败，请稍后重试");
    await db.user.delete({ where: { id } });
    return ok({ id, deleted: true });
  } catch (error) { return handleApiError(error); }
}
