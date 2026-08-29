import { parseChinaDateTime } from "../lib/time";

const fields: Record<string, string[]> = {
  User: ["id", "name", "loginName", "passwordHash", "mustChangePassword", "passwordChangedAt", "role", "feishuUserId", "isActive", "createdAt", "updatedAt"],
  Product: [
    "id", "code", "name", "category", "sourceUrl", "expectedPrice", "notes", "competitorLink", "competitorAsins", "coreKeyword", "priceRange", "topCompetitorLink",
    "seasonality", "usageScenario", "iterationPlan", "targetAudience", "certification", "patentStatus", "trademarkStatus", "competitorReviewsAnalysis", "visualUpgradeDirection",
    "copyrightCheck", "troCheck", "phraseTrademarkCheck", "packaging", "supplyChainAdvantage", "suggestedQuantity", "suggestedPrice", "minPrice", "productCostCny",
    "supplierName", "moq", "unitPrice", "productionTime", "supplierLink", "supplierRemark", "lengthCm", "widthCm", "heightCm", "weightG", "volumetricWeightKg",
    "billingWeightLb", "fbaSizeTier", "fbaFee", "commissionRate", "exchangeRate", "shippingCost", "profitMargin", "profitAmount", "inventoryQuantity", "inventoryValue",
    "finalDecision", "launchDate", "rejectionReason", "firstBatchQuantity", "marketAnalysis", "competitivenessAnalysis", "alternativeSuggestions", "submitterId", "reviewerId",
    "status", "revision", "submitTime", "assignTime", "latestReviewTime", "createdAt", "updatedAt",
  ],
  ReviewRound: ["id", "productId", "roundNumber", "reviewerId", "decision", "comment", "launchDate", "firstBatchQuantity", "marketAnalysis", "competitivenessAnalysis", "alternativeSuggestions", "improvementSuggestions", "createdAt", "updatedAt", "editCount"],
  Objection: ["id", "productId", "roundId", "submitterId", "content", "hasObjection", "createdAt"],
  Attachment: ["id", "productId", "roundId", "objectionId", "attachmentType", "fileName", "filePath", "fileSize", "fileType", "sha256", "uploaderId", "createdAt"],
  AuditLog: ["id", "productId", "operatorId", "action", "detail", "createdAt"],
  NotificationLog: ["id", "recipientId", "channel", "event", "content", "status", "error", "createdAt"],
};

const dateFields = new Set(["passwordChangedAt", "createdAt", "updatedAt", "submitTime", "assignTime", "latestReviewTime", "launchDate"]);

function snakeToCamel(value: string) {
  return value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function dateValue(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return value;
  const native = new Date(value);
  if (!Number.isNaN(native.getTime())) return native;
  return parseChinaDateTime(value) || value;
}

export function scalarData(modelName: string, input: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  const allowed = fields[modelName];
  if (!allowed) throw new Error(`未知 Prisma 模型：${modelName}`);
  const normalized = Object.fromEntries(Object.entries(input).map(([key, value]) => [snakeToCamel(key), value]));
  const merged = { ...normalized, ...overrides };
  const data: Record<string, unknown> = {};
  for (const field of allowed) {
    const value = merged[field];
    if (value !== undefined) data[field] = dateFields.has(field) ? dateValue(value) : value;
  }
  return data;
}

export type LegacyExport = {
  users?: Array<Record<string, unknown>>;
  products?: Array<Record<string, unknown>>;
  reviewRounds?: Array<Record<string, unknown>>;
  review_rounds?: Array<Record<string, unknown>>;
  objections?: Array<Record<string, unknown>>;
  attachments?: Array<Record<string, unknown>>;
  auditLogs?: Array<Record<string, unknown>>;
  audit_log?: Array<Record<string, unknown>>;
  notificationLogs?: Array<Record<string, unknown>>;
  notification_log?: Array<Record<string, unknown>>;
};
