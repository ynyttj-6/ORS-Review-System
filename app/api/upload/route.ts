import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { requireUser, canAccessProduct } from "@/lib/api/auth";
import { ApiError, handleApiError, ok } from "@/lib/api/response";
import { removeStoredFile, storeFile, validateFileContent } from "@/lib/self-hosted/storage";

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
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validateFileContent(file.name, file.type, bytes)) throw new ApiError(400, "文件扩展名、MIME 或内容签名不匹配");

    const db = getPrisma();
    const product = await db.product.findUnique({ where: { id: productId }, include: { _count: { select: { attachments: true } } } });
    if (!product) throw new ApiError(404, "选品不存在");
    if (!canAccessProduct(user, product)) throw new ApiError(403, "无权为该选品上传附件");
    if (product._count.attachments >= 20) throw new ApiError(409, "每个选品最多上传 20 个附件");
    if (objectionId) {
      const objection = await db.objection.findFirst({ where: { id: objectionId, productId } });
      if (!objection) throw new ApiError(400, "异议记录与选品不匹配");
    }

    const stored = await storeFile(productId, file.name, bytes).catch(() => { throw new ApiError(500, "附件写入本机存储失败"); });

    try {
      const attachment = await db.attachment.create({ data: { productId, uploaderId: user.id, objectionId, attachmentType: attachmentType as "product_image" | "competitor_screenshot" | "data_screenshot" | "supplier_info", fileName: file.name, filePath: stored.relativePath, fileSize: file.size, fileType: file.type, sha256: stored.sha256 } });
      await db.auditLog.create({ data: { productId, operatorId: user.id, action: "upload", detail: { attachmentId: attachment.id, fileName: file.name, fileSize: file.size, sha256: stored.sha256 } } });
      return ok({ id: attachment.id, name: attachment.fileName, size: attachment.fileSize, type: attachment.fileType, attachmentType: attachment.attachmentType, objectionId: attachment.objectionId || undefined, path: attachment.filePath }, 201);
    } catch (error) {
      await removeStoredFile(stored.relativePath).catch(async (cleanupError) => {
        await db.fileCleanupTask.create({ data: { relativePath: stored.relativePath, reason: "attachment_record_failed", lastError: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) } }).catch(() => undefined);
      });
      throw error;
    }
  } catch (error) { return handleApiError(error); }
}
