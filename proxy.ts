import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_APP_MODE === "production" && request.nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const expectedHost = forwardedHost || request.headers.get("host") || request.nextUrl.host;
    let trustedOrigin = !origin;
    if (origin) {
      try { trustedOrigin = new URL(origin).host === expectedHost; } catch { trustedOrigin = false; }
    }
    if (!trustedOrigin || (fetchSite && !["same-origin", "none"].includes(fetchSite))) {
      return NextResponse.json({ error: "请求来源校验失败" }, { status: 403 });
    }
  }
  return updateSession(request);
}

export const config = {
  // 覆盖所有业务页面和 API，使 Supabase 会话可以持续刷新；静态资源无需进入代理。
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
