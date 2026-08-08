import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { reviewSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { productInclude, serializeProduct } from "@/lib/api/serialize";
import { notifyUser } from "@/lib/feishu/notify";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  try {
    const reviewer = await requireUser(["admin", "operator"]);
    const { id, roundId } = await params;
    const input = reviewSchema.parse(await request.json());
    const db = getPrisma();
    const existing = await db.product.findUnique({
      where: { id },
      include: { reviews: { orderBy: { roundNumber: "desc" }, take: 1, include: { objections: true } } },
    });
    if (!existing) throw new ApiError(404, "选品不存在");
    const latest = existing.reviews[0];
    if (!latest || latest.id !== roundId) throw new ApiError(409, "只能修改最新一轮审核结果");
    if (reviewer.role === "operator" && latest.reviewerId !== reviewer.id) throw new ApiError(403, "只能修改自己提交的审核结果");
    if (existing.status === "draft" || existing.status === "pending_assign") throw new ApiError(409, "选品已被开发人员撤回，不能修改审核结果");
    if (latest.objections.length) throw new ApiError(409, "开发人员已针对本轮提交异议，不能再修改该轮结果");
    if (input.decision === "redevelop" && latest.roundNumber >= 3) throw new ApiError(409, "第 3 轮必须做出通过或不通过的最终决定");

    const launchDate = input.launchDate ? new Date(`${input.launchDate}T00:00:00Z`) : null;
    const nextStatus = input.decision === "redevelop" ? "objection_pending" : input.decision;
    const before = { decision: latest.decision, comment: latest.comment, launchDate: latest.launchDate, firstBatchQuantity: latest.firstBatchQuantity };
    const product = await db.$transaction(async (tx) => {
      await tx.reviewRound.update({
        where: { id: roundId },
        data: {
          decision: input.decision,
          comment: input.comment,
          launchDate: input.decision === "approved" ? launchDate : null,
          firstBatchQuantity: input.decision === "approved" ? input.firstBatchQuantity : null,
          marketAnalysis: input.marketAnalysis || null,
          competitivenessAnalysis: input.competitivenessAnalysis || null,
          alternativeSuggestions: input.alternativeSuggestions || null,
          improvementSuggestions: input.decision === "redevelop" ? input.improvementSuggestions || null : null,
          editCount: { increment: 1 },
        },
      });
      const updated = await tx.product.update({
        where: { id },
        data: {
          status: nextStatus,
          latestReviewTime: new Date(),
          finalDecision: input.decision === "redevelop" ? null : input.decision,
          launchDate: input.decision === "approved" ? launchDate : null,
          rejectionReason: input.decision === "approved" ? null : input.comment,
          firstBatchQuantity: input.decision === "approved" ? input.firstBatchQuantity : null,
          marketAnalysis: input.marketAnalysis || null,
          competitivenessAnalysis: input.competitivenessAnalysis || null,
          alternativeSuggestions: input.alternativeSuggestions || null,
        },
        include: productInclude,
      });
      await tx.auditLog.create({ data: { productId: id, operatorId: reviewer.id, action: "review_update", detail: { roundId, round: latest.roundNumber, before, after: input } } });
      return updated;
    });

    await notifyUser({ recipientId: product.submitterId, event: "review_update", title: "历史审核结果已修改", content: `选品 **${product.name}** 的第 ${latest.roundNumber} 轮审核结果已修改为：${input.decision === "approved" ? "通过-上架" : input.decision === "rejected" ? "不通过" : "驳回-二次开发"}。`, link: `${process.env.NEXT_PUBLIC_APP_URL}/products`, color: input.decision === "approved" ? "green" : input.decision === "rejected" ? "red" : "orange" });
    return ok(serializeProduct(product));
  } catch (error) { return handleApiError(error); }
}
