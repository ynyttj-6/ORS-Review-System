import "./load-env";

import process from "node:process";

import { getPrisma } from "../lib/db";
import { CHINA_TIME_ZONE, formatChinaDateTime } from "../lib/time";

async function main() {
  const productCode = process.argv[2];
  if (!productCode) throw new Error("Provide a product code: npm run review:check -- ORS-260803-5556F0");

  const product = await getPrisma().product.findUnique({
    where: { code: productCode },
    select: {
      code: true,
      status: true,
      latestReviewTime: true,
      reviews: {
        orderBy: { roundNumber: "desc" },
        take: 1,
        select: {
          roundNumber: true,
          decision: true,
          comment: true,
          createdAt: true,
          reviewer: { select: { name: true, role: true } },
        },
      },
      auditLogs: {
        where: { action: "review" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          action: true,
          detail: true,
          createdAt: true,
          operator: { select: { name: true, role: true } },
        },
      },
    },
  });

  if (!product) throw new Error(`Product not found: ${productCode}`);

  const latestReview = product.reviews[0] ?? null;
  const latestAudit = product.auditLogs[0] ?? null;
  const result = {
    productCode: product.code,
    status: product.status,
    timeZone: CHINA_TIME_ZONE,
    latestReviewTime: product.latestReviewTime ? formatChinaDateTime(product.latestReviewTime) : null,
    review: latestReview ? { ...latestReview, createdAt: formatChinaDateTime(latestReview.createdAt) } : null,
    audit: latestAudit ? { ...latestAudit, createdAt: formatChinaDateTime(latestAudit.createdAt) } : null,
    verified:
      Boolean(latestReview) &&
      Boolean(latestAudit) &&
      latestReview?.decision === product.status &&
      latestAudit?.action === "review",
  };

  console.log(JSON.stringify(result));
  if (!result.verified) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Review verification failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getPrisma().$disconnect();
    } catch {
      // The client may not have been created when environment validation fails.
    }
  });
