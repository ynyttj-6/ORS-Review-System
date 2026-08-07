import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { publicSupabaseEnv } from "@/lib/env";

export async function getSessionFingerprint() {
  const cookieStore = await cookies();
  const sessionCookies = cookieStore.getAll()
    .filter(({ name }) => name.includes("-auth-token"))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (!sessionCookies.length) return null;
  return createHash("sha256")
    .update(sessionCookies.map(({ name, value }) => `${name}=${value}`).join(";"))
    .digest("base64url");
}

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = publicSupabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component 无法写 cookie；Proxy 会负责刷新会话。
        }
      },
    },
  });
}
