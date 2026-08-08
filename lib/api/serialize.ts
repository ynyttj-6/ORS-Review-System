import type { Prisma } from "@/lib/generated/prisma/client";
import { formatChinaDate, formatChinaDateTime } from "@/lib/time";

export const productInclude = {
  attachments: { orderBy: { createdAt: "asc" as const } },
  reviews: { orderBy: { roundNumber: "asc" as const } },
  objections: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const dateTime = (value: Date | null | undefined) => value ? formatChinaDateTime(value) : undefined;
const date = (value: Date | null | undefined) => value ? formatChinaDate(value) : undefined;
const decimal = (value: { toString(): string } | null | undefined) => value == null ? undefined : Number(value);

export function serializeProduct(product: ProductRecord) {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    category: product.category || "其他",
    sourceUrl: product.sourceUrl || undefined,
    expectedPrice: product.expectedPrice ? Number(product.expectedPrice) : undefined,
    notes: product.notes || undefined,
    competitorLink: product.competitorLink || product.sourceUrl || undefined,
    competitorAsins: product.competitorAsins || undefined,
    coreKeyword: product.coreKeyword || undefined,
    priceRange: product.priceRange || undefined,
    topCompetitorLink: product.topCompetitorLink || undefined,
    seasonality: product.seasonality || undefined,
    usageScenario: product.usageScenario || undefined,
    iterationPlan: product.iterationPlan || undefined,
    targetAudience: product.targetAudience || undefined,
    certification: product.certification || undefined,
    patentStatus: product.patentStatus || undefined,
    trademarkStatus: product.trademarkStatus || undefined,
    competitorReviewsAnalysis: product.competitorReviewsAnalysis || undefined,
    visualUpgradeDirection: product.visualUpgradeDirection || undefined,
    copyrightCheck: product.copyrightCheck || undefined,
    troCheck: product.troCheck || undefined,
    phraseTrademarkCheck: product.phraseTrademarkCheck || undefined,
    packaging: product.packaging || undefined,
    supplyChainAdvantage: product.supplyChainAdvantage || undefined,
    suggestedQuantity: product.suggestedQuantity ?? undefined,
    suggestedPrice: decimal(product.suggestedPrice),
    minPrice: decimal(product.minPrice),
    productCostCny: decimal(product.productCostCny),
    supplierName: product.supplierName || undefined,
    moq: product.moq ?? undefined,
    unitPrice: product.unitPrice || undefined,
    productionTime: product.productionTime || undefined,
    supplierLink: product.supplierLink || undefined,
    supplierRemark: product.supplierRemark || undefined,
    lengthCm: decimal(product.lengthCm),
    widthCm: decimal(product.widthCm),
    heightCm: decimal(product.heightCm),
    weightG: decimal(product.weightG),
    volumetricWeightKg: decimal(product.volumetricWeightKg),
    billingWeightLb: decimal(product.billingWeightLb),
    fbaSizeTier: product.fbaSizeTier || undefined,
    fbaFee: decimal(product.fbaFee),
    commissionRate: decimal(product.commissionRate),
    exchangeRate: decimal(product.exchangeRate),
    shippingCost: decimal(product.shippingCost),
    profitMargin: decimal(product.profitMargin),
    profitAmount: decimal(product.profitAmount),
    inventoryQuantity: product.inventoryQuantity ?? undefined,
    inventoryValue: decimal(product.inventoryValue),
    finalDecision: product.finalDecision || undefined,
    launchDate: date(product.launchDate),
    rejectionReason: product.rejectionReason || undefined,
    firstBatchQuantity: product.firstBatchQuantity ?? undefined,
    marketAnalysis: product.marketAnalysis || undefined,
    competitivenessAnalysis: product.competitivenessAnalysis || undefined,
    alternativeSuggestions: product.alternativeSuggestions || undefined,
    submitterId: product.submitterId,
    reviewerId: product.reviewerId || undefined,
    status: product.status,
    revision: product.revision,
    submitTime: dateTime(product.submitTime)!,
    assignTime: dateTime(product.assignTime),
    latestReviewTime: dateTime(product.latestReviewTime),
    attachments: product.attachments.map((item) => ({ id: item.id, name: item.fileName, size: item.fileSize, type: item.fileType, path: item.filePath, attachmentType: item.attachmentType, roundId: item.roundId || undefined, objectionId: item.objectionId || undefined })),
    reviews: product.reviews.map((item) => ({ id: item.id, round: item.roundNumber, reviewerId: item.reviewerId, decision: item.decision, comment: item.comment, launchDate: date(item.launchDate), firstBatchQuantity: item.firstBatchQuantity ?? undefined, marketAnalysis: item.marketAnalysis || undefined, competitivenessAnalysis: item.competitivenessAnalysis || undefined, alternativeSuggestions: item.alternativeSuggestions || undefined, improvementSuggestions: item.improvementSuggestions || undefined, createdAt: dateTime(item.createdAt)!, updatedAt: dateTime(item.updatedAt), editCount: item.editCount })),
    objections: product.objections.map((item) => ({ id: item.id, roundId: item.roundId, submitterId: item.submitterId, hasObjection: item.hasObjection, content: item.content, createdAt: dateTime(item.createdAt)! })),
  };
}

export function serializeUser(user: { id: string; name: string; loginName: string; role: "admin" | "developer" | "operator"; feishuUserId: string | null; isActive: boolean; createdAt: Date }) {
  return { id: user.id, name: user.name, account: user.loginName, role: user.role, feishuUserId: user.feishuUserId || undefined, isActive: user.isActive, createdAt: formatChinaDate(user.createdAt) };
}
