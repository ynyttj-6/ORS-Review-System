import type { Prisma } from "@/lib/generated/prisma/client";
import { formatChinaDate, formatChinaDateTime } from "@/lib/time";

export const productInclude = {
  attachments: { orderBy: { createdAt: "asc" as const } },
  reviews: { orderBy: { roundNumber: "asc" as const } },
  objections: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const dateTime = (value: Date | null | undefined) => value ? formatChinaDateTime(value) : undefined;

export function serializeProduct(product: ProductRecord) {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    category: product.category || "其他",
    sourceUrl: product.sourceUrl || undefined,
    expectedPrice: product.expectedPrice ? Number(product.expectedPrice) : undefined,
    notes: product.notes || undefined,
    submitterId: product.submitterId,
    reviewerId: product.reviewerId || undefined,
    status: product.status,
    submitTime: dateTime(product.submitTime)!,
    assignTime: dateTime(product.assignTime),
    latestReviewTime: dateTime(product.latestReviewTime),
    attachments: product.attachments.map((item) => ({ id: item.id, name: item.fileName, size: item.fileSize, type: item.fileType, path: item.filePath })),
    reviews: product.reviews.map((item) => ({ id: item.id, round: item.roundNumber, reviewerId: item.reviewerId, decision: item.decision, comment: item.comment, createdAt: dateTime(item.createdAt)! })),
    objections: product.objections.map((item) => ({ id: item.id, roundId: item.roundId, submitterId: item.submitterId, content: item.content, createdAt: dateTime(item.createdAt)! })),
  };
}

export function serializeUser(user: { id: string; name: string; loginName: string; role: "admin" | "developer" | "operator"; feishuUserId: string | null; isActive: boolean; createdAt: Date }) {
  return { id: user.id, name: user.name, account: user.loginName, role: user.role, feishuUserId: user.feishuUserId || undefined, isActive: user.isActive, createdAt: formatChinaDate(user.createdAt) };
}
