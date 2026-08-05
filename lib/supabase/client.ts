import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseEnv } from "@/lib/env";

export function createClient() {
  const { url, key } = publicSupabaseEnv();
  return createBrowserClient(url, key);
}
