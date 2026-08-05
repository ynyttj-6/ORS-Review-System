import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { importSchema } from "@/lib/api/schemas";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { formatChinaDateCode, parseChinaDateTime } from "@/lib/time";

const text = (value: unknown) => value == null ? "" : String(value).trim();

export async function POST(request: Request) {
  try {
    const admin = await requireUser(["admin"]);
    const { rows } = importSchema.parse(await request.json());
    const db = getPrisma();
    const users = await db.user.findMany({ where: { isActive: true } });
    const defaultSubmitter = users.find((user) => user.role === "developer") || admin;
    let imported = 0;
    let duplicates = 0;

    for (const [index, row] of rows.entries()) {
      const name = text(row["表格名称"] || row["产品名称"]);
      if (!name) continue;
      const submitTimeText = text(row["选品时间"]);
      const parsedTime = submitTimeText ? parseChinaDateTime(submitTimeText) : new Date();
      if (!parsedTime) throw new ApiError(400, `第 ${index + 2} 行选品时间无效，请使用 YYYY-MM-DD HH:mm 北京时间格式`);
      const exists = await db.product.findFirst({ where: { name, submitTime: { gte: new Date(parsedTime.getTime() - 60_000), lte: new Date(parsedTime.getTime() + 60_000) } } });
      if (exists) { duplicates += 1; continue; }
      const submitter = users.find((user) => user.name === text(row["开发人员"])) || defaultSubmitter;
      const reviewer = users.find((user) => user.role === "operator" && user.name === text(row["运营分配"]));
      const product = await db.product.create({ data: {
        code: `IMP-${formatChinaDateCode()}-${Date.now().toString(36).toUpperCase()}-${index}`,
        name,
        category: text(row["类目"]) || "其他",
        submitterId: submitter.id,
        reviewerId: reviewer?.id,
        status: reviewer ? "pending_review" : "pending_assign",
        submitTime: parsedTime,
        assignTime: reviewer ? new Date() : null,
      } });
      await db.auditLog.create({ data: { productId: product.id, operatorId: admin.id, action: "import", detail: { sourceRow: index + 2, original: JSON.parse(JSON.stringify(row)) } } });
      imported += 1;
    }
    if (!imported && duplicates === rows.length) throw new ApiError(409, "所有记录均已存在，未导入新数据");
    return ok({ imported, duplicates, skipped: rows.length - imported - duplicates });
  } catch (error) { return handleApiError(error); }
}
