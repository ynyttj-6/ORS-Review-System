import "./load-env";

import { randomUUID } from "node:crypto";
import process from "node:process";
import { getPrisma } from "../lib/db";
import { loginRateKeys } from "../lib/security/login-rate-limit";

async function main() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("缺少 NEXT_PUBLIC_APP_URL");
  const account = `security-${randomUUID()}`;
  const testAddress = "203.0.113.42";
  const headers = { "content-type": "application/json", origin: appUrl, "x-forwarded-for": testAddress };
  const body = JSON.stringify({ account, password: "Invalid-Security-Test-Password" });
  const statuses: number[] = [];

  try {
    const health = await fetch(new URL("/api/health", appUrl));
    const csp = health.headers.get("content-security-policy") || "";
    const hsts = health.headers.get("strict-transport-security") || "";
    if (!health.ok || !csp.includes("frame-ancestors 'none'") || csp.includes("upgrade-insecure-requests") || hsts) throw new Error("HTTP 内网安全响应头检查失败");

    const forged = await fetch(new URL("/api/auth/login", appUrl), { method: "POST", headers: { ...headers, origin: "https://attacker.example" }, body });
    if (forged.status !== 403) throw new Error(`跨站写请求未被阻止：${forged.status}`);

    for (let index = 0; index < 6; index += 1) {
      const response = await fetch(new URL("/api/auth/login", appUrl), { method: "POST", headers, body });
      statuses.push(response.status);
    }
    if (statuses.slice(0, 5).some((status) => status !== 401) || statuses[5] !== 429) throw new Error(`登录限流结果异常：${statuses.join(",")}`);
    console.log(JSON.stringify({ securityHeaders: true, httpModeHasNoHsts: true, crossSiteWriteBlocked: true, loginRateLimit: true }));
  } finally {
    const syntheticRequest = new Request(appUrl, { headers: { "x-forwarded-for": testAddress } });
    await getPrisma().loginRateLimit.deleteMany({ where: { key: { in: loginRateKeys(syntheticRequest, account).map(({ key }) => key) } } }).catch(() => undefined);
    await getPrisma().$disconnect().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "安全加固检查失败");
  process.exitCode = 1;
});
