import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { handleApiError, ok, ApiError } from "@/lib/api/response";

export async function POST() {
  try {
    const admin = await requireUser(["admin"]);
    const db = getPrisma();
    const [products, operators] = await Promise.all([
      db.product.findMany({ where: { status: "pending_assign" }, orderBy: { submitTime: "asc" } }),
      db.user.findMany({ where: { role: "operator", isActive: true }, orderBy: { name: "asc" } }),
    ]);
    if (!operators.length) throw new ApiError(400, "没有可参与分配的运营人员");
    await db.$transaction(products.flatMap((product, index) => {
      const reviewer = operators[index % operators.length];
      return [
        db.product.update({ where: { id: product.id }, data: { reviewerId: reviewer.id, status: "pending_review", assignTime: new Date() } }),
        db.auditLog.create({ data: { productId: product.id, operatorId: admin.id, action: "auto_assign", detail: { reviewerId: reviewer.id, reviewerName: reviewer.name } } }),
      ];
    }));
    return ok({ count: products.length });
  } catch (error) { return handleApiError(error); }
}
