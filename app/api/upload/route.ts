import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { requireUser, canAccessProduct } from "@/lib/api/auth";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { productionEnv } from "@/lib/env";

const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const attachmentTypes = new Set(["product_image", "competitor_screenshot", "data_screenshot", "supplier_info"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const productId = String(formData.get("productId") || "");
    const attachmentType = String(formData.get("attachmentType") || "data_screenshot");
    const objectionId = String(formData.get("objectionId") || "") || null;
    const file = formData.get("file");
    if (!productId || !(file instanceof File)) throw new ApiError(400, "缺少产品或文件参数");
    if (!allowedTypes.has(file.type)) throw new ApiError(400, "仅支持 JPG、PNG、PDF 文件");
    if (!attachmentTypes.has(attachmentType)) throw new ApiError(400, "附件类型无效");
    if (file.size > MAX_FILE_SIZE) throw new ApiError(400, "单个附件不能超过 10MB");

    const db = getPrisma();
    const product = await db.product.findUnique({ where: { id: productId }, include: { _count: { select: { attachments: true } } } });
    if (!product) throw new ApiError(404, "选品不存在");
    if (!canAccessProduct(user, product)) throw new ApiError(403, "无权为该选品上传附件");
    if (product._count.attachments >= 20) throw new ApiError(409, "每个选品最多上传 20 个附件");
    if (objectionId) {
      const objection = await db.objection.findFirst({ where: { id: objectionId, productId } });
      if (!objection) throw new ApiError(400, "异议记录与选品不匹配");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const path = `${productId}/${randomUUID()}-${safeName}`;
    const env = productionEnv();
    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (error) throw new ApiError(502, `附件存储失败：${error.message}`);

    try {
      const attachment = await db.attachment.create({ data: { productId, uploaderId: user.id, objectionId, attachmentType: attachmentType as "product_image" | "competitor_screenshot" | "data_screenshot" | "supplier_info", fileName: file.name, filePath: path, fileSize: file.size, fileType: file.type } });
      await db.auditLog.create({ data: { productId, operatorId: user.id, action: "upload", detail: { attachmentId: attachment.id, fileName: file.name, fileSize: file.size } } });
      return ok({ id: attachment.id, name: attachment.fileName, size: attachment.fileSize, type: attachment.fileType, attachmentType: attachment.attachmentType, objectionId: attachment.objectionId || undefined, path: attachment.filePath }, 201);
    } catch (error) {
      await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([path]);
      throw error;
    }
  } catch (error) { return handleApiError(error); }
}
