import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { objectionSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { productInclude, serializeProduct } from "@/lib/api/serialize";
import { notifyUser } from "@/lib/feishu/notify";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const developer = await requireUser(["developer"]);
    const { id } = await params;
    const input = objectionSchema.parse(await request.json());
    const db = getPrisma();
    const existing = await db.product.findUnique({ where: { id }, include: { reviews: { orderBy: { roundNumber: "desc" }, take: 1 } } });
    if (!existing) throw new ApiError(404, "选品不存在");
    if (existing.submitterId !== developer.id) throw new ApiError(403, "只能对自己提交的选品提出异议");
    if (existing.status !== "objection_pending" || !existing.reviews[0]) throw new ApiError(409, "该选品当前不可提交异议");
    const product = await db.$transaction(async (tx) => {
      await tx.objection.create({ data: { productId: id, roundId: existing.reviews[0].id, submitterId: developer.id, hasObjection: input.hasObjection, content: input.content } });
      const updated = await tx.product.update({ where: { id }, data: input.hasObjection ? { status: "pending_review" } : { status: "rejected", finalDecision: "rejected", rejectionReason: input.content || "开发确认无异议，放弃该选品" }, include: productInclude });
      await tx.auditLog.create({ data: { productId: id, operatorId: developer.id, action: "object", detail: { roundId: existing.reviews[0].id, content: input.content } } });
      return updated;
    });
    if (input.hasObjection && product.reviewerId) await notifyUser({ recipientId: product.reviewerId, event: "objection", title: "选品异议待复审", content: `选品 **${product.name}** 的开发人员提交了异议，请复审。`, link: `${process.env.NEXT_PUBLIC_APP_URL}/review`, color: "orange" });
    return ok(serializeProduct(product));
  } catch (error) { return handleApiError(error); }
}
