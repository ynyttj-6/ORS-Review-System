export type Role = "admin" | "developer" | "operator";
export type ProductStatus =
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
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface ReviewRound {
  id: string;
  round: number;
  reviewerId: string;
  decision: Decision;
  comment: string;
  createdAt: string;
}

export interface Objection {
  id: string;
  roundId: string;
  submitterId: string;
  content: string;
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
  submitterId: string;
  reviewerId?: string;
  status: ProductStatus;
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
