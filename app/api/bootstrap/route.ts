import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { handleApiError, ok } from "@/lib/api/response";
import { productInclude, serializeProduct, serializeUser } from "@/lib/api/serialize";
import { formatChinaDateTime } from "@/lib/time";

export async function GET() {
  try {
    const currentUser = await requireUser();
    const db = getPrisma();
    const where = currentUser.role === "developer" ? { submitterId: currentUser.id } : currentUser.role === "operator" ? { reviewerId: currentUser.id } : {};
    const [products, notices] = await Promise.all([
      db.product.findMany({ where, include: productInclude, orderBy: { submitTime: "desc" } }),
      db.notificationLog.findMany({ where: currentUser.role === "admin" ? {} : { recipientId: currentUser.id }, include: { recipient: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    const visibleUserIds = new Set<string>([currentUser.id]);
    products.forEach((product) => {
      visibleUserIds.add(product.submitterId);
      if (product.reviewerId) visibleUserIds.add(product.reviewerId);
      product.reviews.forEach((review) => visibleUserIds.add(review.reviewerId));
      product.objections.forEach((objection) => visibleUserIds.add(objection.submitterId));
    });
    const users = await db.user.findMany({
      where: currentUser.role === "admin" ? undefined : { id: { in: [...visibleUserIds] } },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return ok({
      currentUser: serializeUser(currentUser),
      users: users.map((user) => {
        const serialized = serializeUser(user);
        return currentUser.role === "admin" || user.id === currentUser.id
          ? serialized
          : { ...serialized, account: "", feishuUserId: undefined };
      }),
      products: products.map(serializeProduct),
      notices: notices.map((item) => ({ id: item.id, target: item.recipient?.name || "系统", event: item.event, content: item.content, time: formatChinaDateTime(item.createdAt), status: item.status, success: item.status === "success" })),
    });
  } catch (error) { return handleApiError(error); }
}
