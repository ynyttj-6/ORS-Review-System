import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireUser, canAccessProduct } from "@/lib/api/auth";
import { ApiError, handleApiError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { productionEnv } from "@/lib/env";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const attachment = await getPrisma().attachment.findUnique({ where: { id }, include: { product: true } });
    if (!attachment) throw new ApiError(404, "附件不存在");
    if (!canAccessProduct(user, attachment.product)) throw new ApiError(403, "无权访问该附件");
    const env = productionEnv();
    const { data, error } = await createAdminClient().storage.from(env.SUPABASE_STORAGE_BUCKET).createSignedUrl(attachment.filePath, 60);
    if (error || !data.signedUrl) throw new ApiError(502, "无法生成附件下载地址");
    return NextResponse.redirect(data.signedUrl);
  } catch (error) { return handleApiError(error); }
}
