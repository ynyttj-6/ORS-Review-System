export type Role = "admin" | "developer" | "operator";
export type ProductStatus =
  | "draft"
  | "pending_assign"
  | "pending_review"
  | "approved"
  | "rejected"
  | "returned"
  | "redevelop"
  | "objection_pending";
export type Decision = "approved" | "rejected" | "returned" | "redevelop";
export type NoticeStatus = "success" | "failed" | "skipped";

export interface User {
  id: string;
  name: string;
  account: string;
  role: Role;
  feishuUserId?: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  attachmentType?: "product_image" | "competitor_screenshot" | "data_screenshot" | "supplier_info";
  roundId?: string;
  objectionId?: string;
}

export interface ReviewRound {
  id: string;
  round: number;
  reviewerId: string;
  decision: Decision;
  comment: string;
  createdAt: string;
  updatedAt?: string;
  editCount?: number;
  launchDate?: string;
  firstBatchQuantity?: number;
  marketAnalysis?: string;
  competitivenessAnalysis?: string;
  alternativeSuggestions?: string;
  improvementSuggestions?: string;
}

export interface Objection {
  id: string;
  roundId: string;
  submitterId: string;
  content: string;
  hasObjection: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  sourceUrl?: string;
  expectedPrice?: number;
  notes?: string;
  competitorLink?: string;
  competitorAsins?: string;
  coreKeyword?: string;
  priceRange?: string;
  topCompetitorLink?: string;
  seasonality?: string;
  usageScenario?: string;
  iterationPlan?: string;
  targetAudience?: string;
  certification?: string;
  patentStatus?: string;
  trademarkStatus?: string;
  competitorReviewsAnalysis?: string;
  visualUpgradeDirection?: string;
  copyrightCheck?: string;
  troCheck?: string;
  phraseTrademarkCheck?: string;
  packaging?: string;
  supplyChainAdvantage?: string;
  suggestedQuantity?: number;
  suggestedPrice?: number;
  minPrice?: number;
  productCostCny?: number;
  supplierName?: string;
  moq?: number;
  unitPrice?: string;
  productionTime?: string;
  supplierLink?: string;
  supplierRemark?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightG?: number;
  volumetricWeightKg?: number;
  billingWeightLb?: number;
  fbaSizeTier?: string;
  fbaFee?: number;
  commissionRate?: number;
  exchangeRate?: number;
  shippingCost?: number;
  profitMargin?: number;
  profitAmount?: number;
  inventoryQuantity?: number;
  inventoryValue?: number;
  finalDecision?: Decision;
  launchDate?: string;
  rejectionReason?: string;
  firstBatchQuantity?: number;
  marketAnalysis?: string;
  competitivenessAnalysis?: string;
  alternativeSuggestions?: string;
  submitterId: string;
  reviewerId?: string;
  status: ProductStatus;
  revision?: number;
  submitTime: string;
  assignTime?: string;
  latestReviewTime?: string;
  attachments: Attachment[];
  reviews: ReviewRound[];
  objections: Objection[];
}

export interface NoticeLog {
  id: string;
  target: string;
  event: string;
  content: string;
  time: string;
  success: boolean;
  status?: NoticeStatus;
}

export interface AppState {
  users: User[];
  products: Product[];
  notices: NoticeLog[];
}
