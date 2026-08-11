import { z } from "zod";

const productionSchema = z.object({
  NEXT_PUBLIC_APP_MODE: z.literal("production"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  DATABASE_URL: z.string().startsWith("postgres"),
  DIRECT_URL: z.string().startsWith("postgres"),
  SUPABASE_STORAGE_BUCKET: z.string().min(3).default("product-attachments"),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_REQUIRE_ADMIN_MFA: z.enum(["true", "false"]).default("false"),
  AUTH_EMAIL_DELIVERY_REQUIRED: z.enum(["true", "false"]).default("false"),
  AUTH_CUSTOM_SMTP_CONFIGURED: z.enum(["true", "false"]).default("false"),
  BACKUP_POLICY_CONFIGURED: z.enum(["true", "false"]).default("false"),
  PRODUCTION_READINESS_STRICT: z.enum(["true", "false"]).default("false"),
  FEISHU_APP_ID: z.string().optional(),
  FEISHU_APP_SECRET: z.string().optional(),
});

export const isProductionMode = () => process.env.NEXT_PUBLIC_APP_MODE === "production";
export const isAdminMfaRequired = () => process.env.NEXT_PUBLIC_REQUIRE_ADMIN_MFA === "true";

export function productionEnv() {
  const parsed = productionSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join("、");
    throw new Error(`生产环境配置不完整：${missing}。请参考 .env.example。`);
  }
  return parsed.data;
}

export function publicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("尚未配置 Supabase Project URL / Publishable Key");
  return { url, key };
}
