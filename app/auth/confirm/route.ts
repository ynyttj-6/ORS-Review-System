import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const requestedNext = request.nextUrl.searchParams.get("next") || "/set-password";
  const safeNext = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/set-password";
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(safeNext, request.url));
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("error", "邀请链接无效或已过期，请联系管理员重新发送");
  return NextResponse.redirect(login);
}
