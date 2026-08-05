import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { createProductSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { productInclude, serializeProduct } from "@/lib/api/serialize";
import { formatChinaDateCode } from "@/lib/time";

export async function GET() {
  try {
    const user = await requireUser();
    const where = user.role === "developer" ? { submitterId: user.id } : user.role === "operator" ? { reviewerId: user.id } : {};
    const products = await getPrisma().product.findMany({ where, include: productInclude, orderBy: { submitTime: "desc" } });
    return ok(products.map(serializeProduct));
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["admin", "developer"]);
    const input = createProductSchema.parse(await request.json());
    const code = `ORS-${formatChinaDateCode()}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const product = await getPrisma().$transaction(async (tx) => {
      const created = await tx.product.create({ data: { ...input, sourceUrl: input.sourceUrl || null, submitterId: user.id, code }, include: productInclude });
      await tx.auditLog.create({ data: { productId: created.id, operatorId: user.id, action: "submit", detail: { code, name: input.name } } });
      return created;
    });
    return ok(serializeProduct(product), 201);
  } catch (error) { return handleApiError(error); }
}
