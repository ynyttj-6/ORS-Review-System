import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { updateProductSchema } from "@/lib/api/schemas";
import { productData } from "@/lib/api/product-data";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { productInclude, serializeProduct } from "@/lib/api/serialize";
import { removeStoredFile } from "@/lib/self-hosted/storage";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(["admin", "developer"]);
    const { id } = await params;
    const input = updateProductSchema.parse(await request.json());
    const db = getPrisma();
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "选品不存在");
    if (user.role === "developer" && existing.submitterId !== user.id) throw new ApiError(403, "只能编辑自己的选品");
    if (existing.status !== "draft") throw new ApiError(409, "只有草稿可以编辑");
    const merged = {
      ...Object.fromEntries(Object.entries(existing).map(([key, value]) => [key, value && typeof value === "object" && "toNumber" in value ? (value as { toNumber(): number }).toNumber() : value])),
      ...input,
    };
    const product = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: productData(merged), include: productInclude });
      await tx.auditLog.create({ data: { productId: id, operatorId: user.id, action: "update_draft", detail: { fields: Object.keys(input) } } });
      return updated;
    });
    return ok(serializeProduct(product));
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(["admin", "developer"]);
    const { id } = await params;
    const db = getPrisma();
    const existing = await db.product.findUnique({ where: { id }, include: { attachments: { select: { filePath: true } }, _count: { select: { reviews: true } } } });
    if (!existing) throw new ApiError(404, "选品不存在");
    if (user.role === "developer" && existing.submitterId !== user.id) throw new ApiError(403, "只能删除自己的草稿");
    if (existing.status !== "draft") throw new ApiError(409, "只有草稿可以删除");
    if (existing.revision > 1 || existing._count.reviews > 0) throw new ApiError(409, "历史选品草稿不能删除，请修改后重新提交");
    await db.product.delete({ where: { id } });
    for (const attachment of existing.attachments) {
      try {
        await removeStoredFile(attachment.filePath);
      } catch (error) {
        await db.fileCleanupTask.create({ data: { relativePath: attachment.filePath, reason: "draft_deleted", lastError: error instanceof Error ? error.message : String(error) } });
      }
    }
    return ok({ id, deleted: true });
  } catch (error) { return handleApiError(error); }
}
