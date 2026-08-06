export interface ProductCalculationInput {
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
}

export interface ProductCalculationResult {
  volumetricWeightKg?: number;
  billingWeightLb?: number;
  fbaSizeTier?: string;
  fbaFee?: number;
  profitAmount?: number;
  profitMargin?: number;
  inventoryValue?: number;
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

/**
 * 2026 Amazon.com US 非服装标准尺寸估算。
 * 基础分段按公布费率卡建模，并包含 2026-04-17 起 3.5% 燃油与物流附加费。
 * 大件/特殊商品返回保守估算，最终采购前仍应以 Seller Central Revenue Calculator 为准。
 */
export function calculateFbaFee(input: Pick<ProductCalculationInput, "suggestedPrice" | "lengthCm" | "widthCm" | "heightCm" | "weightG">) {
  const { suggestedPrice: price = 0, lengthCm, widthCm, heightCm, weightG } = input;
  if (![lengthCm, widthCm, heightCm, weightG].every((value) => typeof value === "number" && value > 0)) return {};

  const dimensionsIn = [lengthCm!, widthCm!, heightCm!].map((value) => value / 2.54).sort((a, b) => b - a);
  const [longest, median, shortest] = dimensionsIn;
  const actualLb = weightG! / 453.59237;
  const volumetricWeightKg = lengthCm! * widthCm! * heightCm! / 6000;
  const dimensionalLb = longest * median * shortest / 139;
  const billingWeightLb = Math.max(actualLb, dimensionalLb);
  const isSmallStandard = longest <= 15 && median <= 12 && shortest <= 0.75 && actualLb <= 1;
  const isLargeStandard = longest <= 18 && median <= 14 && shortest <= 8 && actualLb <= 20;
  const priceBandAdjustment = price < 10 ? 0.05 : price <= 50 ? 0.08 : 0.31;
  let baseFee: number;
  let fbaSizeTier: string;

  if (isSmallStandard) {
    fbaSizeTier = "小号标准尺寸";
    const ounces = Math.max(2, Math.ceil(billingWeightLb * 16 / 2) * 2);
    baseFee = price < 10
      ? 2.29 + Math.max(0, ounces - 2) / 2 * 0.10
      : 3.06 + Math.max(0, ounces - 2) / 2 * 0.10;
  } else if (isLargeStandard) {
    fbaSizeTier = "大号标准尺寸";
    if (billingWeightLb <= 0.25) baseFee = price < 10 ? 2.91 : 3.68;
    else if (billingWeightLb <= 0.5) baseFee = price < 10 ? 3.13 : 3.90;
    else if (billingWeightLb <= 0.75) baseFee = price < 10 ? 3.38 : 4.15;
    else if (billingWeightLb <= 1) baseFee = price < 10 ? 3.78 : 4.55;
    else if (billingWeightLb <= 1.25) baseFee = price < 10 ? 4.22 : 4.99;
    else if (billingWeightLb <= 1.5) baseFee = price < 10 ? 4.60 : 5.37;
    else if (billingWeightLb <= 1.75) baseFee = price < 10 ? 4.75 : 5.52;
    else if (billingWeightLb <= 2) baseFee = price < 10 ? 4.77 : 5.77;
    else if (billingWeightLb <= 2.25) baseFee = 5.87;
    else if (billingWeightLb <= 2.5) baseFee = 6.05;
    else if (billingWeightLb <= 2.75) baseFee = 6.21;
    else if (billingWeightLb <= 3) baseFee = 6.33;
    else baseFee = 6.33 + Math.ceil(billingWeightLb - 3) * 0.16;
  } else {
    fbaSizeTier = "大件/特殊尺寸（估算）";
    baseFee = 10.65 + Math.max(0, Math.ceil(billingWeightLb - 1)) * 0.38;
  }

  const fbaFee = (baseFee + priceBandAdjustment) * 1.035;
  return {
    volumetricWeightKg: round(volumetricWeightKg, 3),
    billingWeightLb: round(billingWeightLb, 3),
    fbaSizeTier,
    fbaFee: round(fbaFee),
  };
}

export function calculateProductEconomics(input: ProductCalculationInput): ProductCalculationResult {
  const fba = calculateFbaFee(input);
  const price = input.suggestedPrice;
  const productCostCny = input.productCostCny;
  const commissionRate = input.commissionRate ?? 0.15;
  const exchangeRate = input.exchangeRate ?? 7.2;
  const shippingCost = input.shippingCost ?? 0;
  const result: ProductCalculationResult = { ...fba };

  if (typeof price === "number" && price > 0 && typeof productCostCny === "number" && exchangeRate > 0 && typeof fba.fbaFee === "number") {
    const commission = price * commissionRate;
    const costUsd = productCostCny / exchangeRate;
    const profitAmount = price - commission - fba.fbaFee - costUsd - shippingCost;
    result.profitAmount = round(profitAmount);
    result.profitMargin = round(profitAmount / price * 100);
  }
  const quantity = input.inventoryQuantity ?? input.suggestedQuantity;
  if (typeof quantity === "number" && typeof productCostCny === "number") result.inventoryValue = round(quantity * productCostCny);
  return result;
}
