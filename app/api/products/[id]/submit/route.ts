import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { createProductSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { productInclude, serializeProduct } from "@/lib/api/serialize";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(["admin", "developer"]);
    const { id } = await params;
    const db = getPrisma();
    const existing = await db.product.findUnique({ where: { id }, include: productInclude });
    if (!existing) throw new ApiError(404, "选品不存在");
    if (user.role === "developer" && existing.submitterId !== user.id) throw new ApiError(403, "只能提交自己的草稿");
    if (existing.status !== "draft") throw new ApiError(409, "该选品不是草稿");
    createProductSchema.parse({ ...serializeProduct(existing), action: "submit" });
    const product = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: { status: "pending_assign", submitTime: new Date() }, include: productInclude });
      await tx.auditLog.create({ data: { productId: id, operatorId: user.id, action: "submit", detail: { code: existing.code, name: existing.name, revision: existing.revision } } });
      return updated;
    });
    return ok(serializeProduct(product));
  } catch (error) { return handleApiError(error); }
}
