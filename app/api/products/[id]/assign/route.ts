import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { assignSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { productInclude, serializeProduct } from "@/lib/api/serialize";
import { notifyUser } from "@/lib/feishu/notify";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireUser(["admin"]);
    const { id } = await params;
    const { reviewerId } = assignSchema.parse(await request.json());
    const db = getPrisma();
    const reviewer = await db.user.findFirst({ where: { id: reviewerId, role: "operator", isActive: true } });
    if (!reviewer) throw new ApiError(400, "所选运营人员不存在或未启用");
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "选品不存在");
    if (!["pending_assign", "pending_review", "objection_pending"].includes(existing.status)) throw new ApiError(409, "该选品当前不允许更改审核人");
    if (existing.reviewerId === reviewerId) throw new ApiError(409, "新审核人不能与当前审核人相同");
    const previousReviewer = existing.reviewerId ? await db.user.findUnique({ where: { id: existing.reviewerId } }) : null;
    const isReassignment = Boolean(existing.reviewerId);
    const product = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: { reviewerId, status: existing.status === "pending_assign" ? "pending_review" : existing.status, assignTime: new Date() }, include: productInclude });
      await tx.auditLog.create({ data: { productId: id, operatorId: admin.id, action: isReassignment ? "reassign" : "assign", detail: { previousReviewerId: previousReviewer?.id || null, previousReviewerName: previousReviewer?.name || null, reviewerId, reviewerName: reviewer.name, status: existing.status } } });
      return updated;
    });
    if (previousReviewer) await notifyUser({ recipientId: previousReviewer.id, event: "reassign_out", title: "选品审核任务已转交", content: `选品 **${product.name}** 已由管理员转交给 ${reviewer.name} 审核。`, link: `${process.env.NEXT_PUBLIC_APP_URL}/review`, color: "orange" });
    await notifyUser({ recipientId: reviewer.id, event: isReassignment ? "reassign_in" : "assign", title: isReassignment ? "选品审核任务已转交给你" : "新选品待审核", content: `你有一个${isReassignment ? "转交的" : "新的"}选品待审核：**${product.name}**`, link: `${process.env.NEXT_PUBLIC_APP_URL}/review`, color: "blue" });
    return ok(serializeProduct(product));
  } catch (error) { return handleApiError(error); }
}
