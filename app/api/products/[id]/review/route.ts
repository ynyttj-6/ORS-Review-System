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
    if (existing.status !== "pending_review") throw new ApiError(409, "该选品当前不可审核");
    if (input.decision === "redevelop" && existing._count.reviews >= 2) throw new ApiError(409, "已达到最多 3 轮审核，请做出通过或不通过的最终决定");
    // PostgreSQL DATE 不含时区；使用 UTC 午夜避免在驱动序列化时退回前一天。
    const launchDate = input.launchDate ? new Date(`${input.launchDate}T00:00:00Z`) : null;
    const nextStatus = input.decision === "redevelop" ? "objection_pending" : input.decision;
    const product = await db.$transaction(async (tx) => {
      await tx.reviewRound.create({ data: { productId: id, roundNumber: existing._count.reviews + 1, reviewerId: reviewer.id, decision: input.decision, comment: input.comment, launchDate, firstBatchQuantity: input.firstBatchQuantity, marketAnalysis: input.marketAnalysis, competitivenessAnalysis: input.competitivenessAnalysis, alternativeSuggestions: input.alternativeSuggestions, improvementSuggestions: input.improvementSuggestions } });
      const updated = await tx.product.update({ where: { id }, data: { status: nextStatus, latestReviewTime: new Date(), finalDecision: input.decision === "redevelop" ? null : input.decision, launchDate, rejectionReason: input.decision === "approved" ? null : input.comment, firstBatchQuantity: input.firstBatchQuantity, marketAnalysis: input.marketAnalysis, competitivenessAnalysis: input.competitivenessAnalysis, alternativeSuggestions: input.alternativeSuggestions }, include: productInclude });
      await tx.auditLog.create({ data: { productId: id, operatorId: reviewer.id, action: "review", detail: { round: existing._count.reviews + 1, decision: input.decision, comment: input.comment } } });
      return updated;
    });
    await notifyUser({ recipientId: product.submitterId, event: "review", title: "选品审核结果", content: `你的选品 **${product.name}** 审核结果：${input.decision === "approved" ? "通过-上架" : input.decision === "rejected" ? "不通过" : "驳回-二次开发"}`, link: `${process.env.NEXT_PUBLIC_APP_URL}/products`, color: input.decision === "approved" ? "green" : input.decision === "rejected" ? "red" : "orange" });
    return ok(serializeProduct(product));
  } catch (error) { return handleApiError(error); }
}
