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
    if (existing.status !== "pending_assign") throw new ApiError(409, "该选品当前不是待分配状态");
    const product = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: { reviewerId, status: "pending_review", assignTime: new Date() }, include: productInclude });
      await tx.auditLog.create({ data: { productId: id, operatorId: admin.id, action: "assign", detail: { reviewerId, reviewerName: reviewer.name } } });
      return updated;
    });
    await notifyUser({ recipientId: reviewer.id, event: "assign", title: "新选品待审核", content: `你有一个新选品待审核：**${product.name}**`, link: `${process.env.NEXT_PUBLIC_APP_URL}/review`, color: "blue" });
    return ok(serializeProduct(product));
  } catch (error) { return handleApiError(error); }
}
