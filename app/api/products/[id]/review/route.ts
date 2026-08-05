import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { reviewSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { productInclude, serializeProduct } from "@/lib/api/serialize";
import { notifyUser } from "@/lib/feishu/notify";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const reviewer = await requireUser(["admin", "operator"]);
    const { id } = await params;
    const input = reviewSchema.parse(await request.json());
    const db = getPrisma();
    const existing = await db.product.findUnique({ where: { id }, include: { _count: { select: { reviews: true } } } });
    if (!existing) throw new ApiError(404, "选品不存在");
    if (reviewer.role === "operator" && existing.reviewerId !== reviewer.id) throw new ApiError(403, "该选品未分配给你");
    if (!["pending_review", "objection_pending"].includes(existing.status)) throw new ApiError(409, "该选品当前不可审核");
    const product = await db.$transaction(async (tx) => {
      await tx.reviewRound.create({ data: { productId: id, roundNumber: existing._count.reviews + 1, reviewerId: reviewer.id, decision: input.decision, comment: input.comment } });
      const updated = await tx.product.update({ where: { id }, data: { status: input.decision, latestReviewTime: new Date() }, include: productInclude });
      await tx.auditLog.create({ data: { productId: id, operatorId: reviewer.id, action: "review", detail: { round: existing._count.reviews + 1, decision: input.decision, comment: input.comment } } });
      return updated;
    });
    await notifyUser({ recipientId: product.submitterId, event: "review", title: "选品审核结果", content: `你的选品 **${product.name}** 审核结果：${input.decision}`, link: `${process.env.NEXT_PUBLIC_APP_URL}/products`, color: input.decision === "approved" ? "green" : input.decision === "rejected" ? "red" : "orange" });
    return ok(serializeProduct(product));
  } catch (error) { return handleApiError(error); }
}
