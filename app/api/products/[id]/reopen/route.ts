import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { productInclude, serializeProduct } from "@/lib/api/serialize";
import { notifyUser } from "@/lib/feishu/notify";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const developer = await requireUser(["developer"]);
    const { id } = await params;
    const db = getPrisma();
    const existing = await db.product.findUnique({ where: { id }, include: { _count: { select: { reviews: true } } } });
    if (!existing) throw new ApiError(404, "选品不存在");
    if (existing.submitterId !== developer.id) throw new ApiError(403, "只能修改自己提交的历史选品");
    if (existing.status === "draft") throw new ApiError(409, "该选品已经处于可编辑状态");

    const previousReviewerId = existing.reviewerId;
    const product = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          status: "draft",
          revision: { increment: 1 },
          reviewerId: null,
          assignTime: null,
          latestReviewTime: null,
          finalDecision: null,
          launchDate: null,
          rejectionReason: null,
          firstBatchQuantity: null,
          marketAnalysis: null,
          competitivenessAnalysis: null,
          alternativeSuggestions: null,
        },
        include: productInclude,
      });
      await tx.auditLog.create({
        data: {
          productId: id,
          operatorId: developer.id,
          action: "reopen_for_resubmit",
          detail: { previousStatus: existing.status, previousReviewerId, previousRevision: existing.revision, reviewCount: existing._count.reviews },
        },
      });
      return updated;
    });

    if (previousReviewerId) await notifyUser({ recipientId: previousReviewerId, event: "product_reopen", title: "历史选品已撤回修改", content: `开发人员已撤回选品 **${product.name}** 进行第 ${product.revision} 版修改，后续将重新提交审核。`, link: `${process.env.NEXT_PUBLIC_APP_URL}/products`, color: "orange" });
    return ok(serializeProduct(product));
  } catch (error) { return handleApiError(error); }
}
