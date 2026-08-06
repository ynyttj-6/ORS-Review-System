import { calculateProductEconomics } from "@/lib/product-calculations";

type ProductFields = Record<string, unknown> & {
  competitorLink?: string;
  suggestedPrice?: number;
  productCostCny?: number;
  commissionRate?: number;
  exchangeRate?: number;
  shippingCost?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightG?: number;
  suggestedQuantity?: number;
  inventoryQuantity?: number;
};

export function productData(input: ProductFields) {
  const calculated = calculateProductEconomics(input);
  const allowed = [
    "name", "category", "notes", "competitorLink", "competitorAsins", "coreKeyword", "priceRange", "topCompetitorLink",
    "seasonality", "usageScenario", "iterationPlan", "targetAudience", "certification", "patentStatus", "trademarkStatus",
    "competitorReviewsAnalysis", "visualUpgradeDirection", "copyrightCheck", "troCheck", "phraseTrademarkCheck", "packaging",
    "supplyChainAdvantage", "suggestedQuantity", "suggestedPrice", "minPrice", "productCostCny", "supplierName", "moq",
    "unitPrice", "productionTime", "supplierLink", "supplierRemark", "lengthCm", "widthCm", "heightCm", "weightG",
    "commissionRate", "exchangeRate", "shippingCost", "inventoryQuantity",
  ];
  const clean = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)).map(([key, value]) => [key, value === "" ? null : value]));
  return {
    ...clean,
    ...calculated,
    sourceUrl: input.competitorLink || null,
    expectedPrice: input.suggestedPrice,
  };
}
