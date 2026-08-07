import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { createProductSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { productInclude, serializeProduct } from "@/lib/api/serialize";
import { formatChinaDateCode } from "@/lib/time";
import { productData } from "@/lib/api/product-data";
import type { ProductStatus } from "@/lib/generated/prisma/client";

const productStatuses = new Set<ProductStatus>(["draft", "pending_assign", "pending_review", "approved", "rejected", "returned", "redevelop", "objection_pending"]);

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const page = Math.max(Number.parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(url.searchParams.get("pageSize") || "20", 10) || 20, 1), 100);
    const requestedStatus = url.searchParams.get("status") as ProductStatus | null;
    const ownershipWhere = user.role === "developer" ? { submitterId: user.id } : user.role === "operator" ? { reviewerId: user.id } : {};
    const where = requestedStatus && productStatuses.has(requestedStatus) ? { ...ownershipWhere, status: requestedStatus } : ownershipWhere;
    const db = getPrisma();
    const [products, total] = await Promise.all([
      db.product.findMany({ where, include: productInclude, orderBy: { submitTime: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      db.product.count({ where }),
    ]);
    return ok({ items: products.map(serializeProduct), total, page, pageSize });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["admin", "developer"]);
    const input = createProductSchema.parse(await request.json());
    const { action, ...fields } = input;
    const code = `ORS-${formatChinaDateCode()}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const product = await getPrisma().$transaction(async (tx) => {
      const created = await tx.product.create({ data: { ...productData(fields), name: fields.name, category: fields.category || null, status: action === "draft" ? "draft" : "pending_assign", submitterId: user.id, code }, include: productInclude });
      await tx.auditLog.create({ data: { productId: created.id, operatorId: user.id, action: action === "draft" ? "save_draft" : "submit", detail: { code, name: input.name } } });
      return created;
    });
    return ok(serializeProduct(product), 201);
  } catch (error) { return handleApiError(error); }
}
