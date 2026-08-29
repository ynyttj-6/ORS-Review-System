import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "ors_session";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
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

  const isPublicPage = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/tools/export-demo" || request.nextUrl.pathname.startsWith("/api/");
  if (!isPublicPage && !request.cookies.has(SESSION_COOKIE)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
