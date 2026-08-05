import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(1).max(50),
  sourceUrl: z.union([z.url(), z.literal("")]).optional(),
  expectedPrice: z.number().nonnegative().max(999999).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const assignSchema = z.object({ reviewerId: z.uuid() });
export const reviewSchema = z.object({
  decision: z.enum(["approved", "rejected", "returned", "redevelop"]),
  comment: z.string().trim().min(5).max(2000),
});
export const objectionSchema = z.object({ content: z.string().trim().min(10).max(3000) });
export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(50),
  account: z.string().trim().min(3, "登录账号至少 3 位").max(100, "登录账号最多 100 位")
    .regex(/^[A-Za-z0-9][A-Za-z0-9._@-]*$/, "账号只能包含字母、数字、点、下划线、短横线或 @")
    .transform((value) => value.toLowerCase()),
  role: z.enum(["admin", "developer", "operator"]),
  feishuUserId: z.string().trim().max(100).optional(),
  password: z.string().min(12, "密码至少 12 位").max(72, "密码最多 72 位"),
});
export const updateUserSchema = createUserSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export const loginSchema = z.object({
  account: z.string().trim().min(1).max(100).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72),
});
export const importSchema = z.object({ rows: z.array(z.record(z.string(), z.unknown())).min(1).max(500) });
