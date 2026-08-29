import { z } from "zod";

const optionalText = (max = 5000) => z.string().trim().max(max).optional();
const optionalUrl = z.union([z.url(), z.literal("")]).optional();
const optionalMoney = z.number().nonnegative().max(999999).optional();
const optionalPositive = z.number().positive().max(999999).optional();
const optionalInteger = z.number().int().nonnegative().max(10000000).optional();

export const productFieldsSchema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(1).max(50).optional(),
  notes: optionalText(2000),
  competitorLink: optionalUrl,
  competitorAsins: optionalText(1000),
  coreKeyword: optionalText(300),
  priceRange: optionalText(100),
  topCompetitorLink: optionalUrl,
  seasonality: optionalText(),
  usageScenario: optionalText(),
  iterationPlan: optionalText(10000),
  targetAudience: optionalText(),
  certification: optionalText(),
  patentStatus: optionalText(),
  trademarkStatus: optionalText(),
  competitorReviewsAnalysis: optionalText(10000),
  visualUpgradeDirection: optionalText(),
  copyrightCheck: optionalText(),
  troCheck: optionalText(),
  phraseTrademarkCheck: optionalText(),
  packaging: optionalText(),
  supplyChainAdvantage: optionalText(),
  suggestedQuantity: optionalInteger,
  suggestedPrice: optionalPositive,
  minPrice: optionalPositive,
  productCostCny: optionalMoney,
  supplierName: optionalText(200),
  moq: optionalInteger,
  unitPrice: optionalText(300),
  productionTime: optionalText(200),
  supplierLink: optionalUrl,
  supplierRemark: optionalText(),
  lengthCm: optionalPositive,
  widthCm: optionalPositive,
  heightCm: optionalPositive,
  weightG: optionalPositive,
  commissionRate: z.number().min(0).max(1).optional(),
  exchangeRate: z.number().positive().max(100).optional(),
  shippingCost: optionalMoney,
  inventoryQuantity: optionalInteger,
});

const submitRequired = [
  "competitorLink", "coreKeyword", "priceRange", "seasonality", "usageScenario", "iterationPlan",
  "certification", "patentStatus", "trademarkStatus", "competitorReviewsAnalysis", "copyrightCheck",
  "troCheck", "packaging", "suggestedQuantity", "suggestedPrice", "minPrice", "productCostCny",
  "supplierName", "moq", "unitPrice", "productionTime", "supplierLink", "lengthCm", "widthCm", "heightCm", "weightG",
] as const;

export const createProductSchema = productFieldsSchema.extend({ action: z.enum(["draft", "submit"]).default("submit") }).superRefine((value, context) => {
  if (value.action !== "submit") return;
  submitRequired.forEach((field) => {
    if (value[field] === undefined || value[field] === "") context.addIssue({ code: "custom", path: [field], message: "提交审核前必须填写" });
  });
  if (value.suggestedPrice && value.minPrice && value.minPrice > value.suggestedPrice) context.addIssue({ code: "custom", path: ["minPrice"], message: "最低售价不能高于建议售价" });
});

export const updateProductSchema = productFieldsSchema.partial();

export const assignSchema = z.object({ reviewerId: z.uuid() });
export const reviewSchema = z.object({
  decision: z.enum(["approved", "rejected", "redevelop"]),
  comment: z.string().trim().min(5).max(2000),
  launchDate: z.string().date().optional(),
  firstBatchQuantity: z.number().int().positive().max(10000000).optional(),
  marketAnalysis: optionalText(),
  competitivenessAnalysis: optionalText(),
  alternativeSuggestions: optionalText(),
  improvementSuggestions: optionalText(),
}).superRefine((value, context) => {
  if (value.decision === "approved") {
    if (!value.launchDate) context.addIssue({ code: "custom", path: ["launchDate"], message: "通过时必须填写计划上架日期" });
    if (!value.firstBatchQuantity) context.addIssue({ code: "custom", path: ["firstBatchQuantity"], message: "通过时必须填写首批发货数量" });
  }
});
export const objectionSchema = z.object({ hasObjection: z.boolean().default(true), content: z.string().trim().max(3000) }).superRefine((value, context) => {
  if (value.hasObjection && value.content.length < 10) context.addIssue({ code: "custom", path: ["content"], message: "异议说明至少填写 10 个字" });
});
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
export const changePasswordSchema = z.object({
  currentPassword: z.string().max(72).optional(),
  newPassword: z.string().min(12, "密码至少 12 位").max(72, "密码最多 72 位"),
});
export const importSchema = z.object({ rows: z.array(z.record(z.string(), z.unknown())).min(1).max(500) });
