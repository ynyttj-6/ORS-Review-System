import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireUser, canAccessProduct } from "@/lib/api/auth";
import { ApiError, handleApiError } from "@/lib/api/response";
import { resolveStoredFile } from "@/lib/self-hosted/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const attachment = await getPrisma().attachment.findUnique({ where: { id }, include: { product: true } });
    if (!attachment) throw new ApiError(404, "附件不存在");
    if (!canAccessProduct(user, attachment.product)) throw new ApiError(403, "无权访问该附件");
    const absolutePath = resolveStoredFile(attachment.filePath);
    const fileStat = await stat(absolutePath).catch(() => null);
    if (!fileStat?.isFile()) throw new ApiError(404, "附件文件已丢失，请联系管理员");
    const stream = Readable.toWeb(createReadStream(absolutePath));
    return new NextResponse(stream as BodyInit, {
      headers: {
        "Content-Type": attachment.fileType,
        "Content-Length": String(fileStat.size),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) { return handleApiError(error); }
}
