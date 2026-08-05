import type { AppState, Product, User } from "@/types";

export const seedUsers: User[] = [
  { id: "u-admin", name: "林晓", account: "admin", role: "admin", feishuUserId: "ou_admin", isActive: true, createdAt: "2026-01-06" },
  { id: "u-dev-1", name: "张宁", account: "zhang.ning", role: "developer", feishuUserId: "ou_dev_1", isActive: true, createdAt: "2026-02-14" },
  { id: "u-dev-2", name: "陈语", account: "chen.yu", role: "developer", feishuUserId: "ou_dev_2", isActive: true, createdAt: "2026-03-01" },
  { id: "u-dev-3", name: "周舟", account: "zhou.zhou", role: "developer", isActive: true, createdAt: "2026-03-20" },
  { id: "u-op-1", name: "赵可", account: "zhao.ke", role: "operator", feishuUserId: "ou_op_1", isActive: true, createdAt: "2026-01-12" },
  { id: "u-op-2", name: "王璐", account: "wang.lu", role: "operator", feishuUserId: "ou_op_2", isActive: true, createdAt: "2026-01-12" },
  { id: "u-op-3", name: "孙浩", account: "sun.hao", role: "operator", isActive: true, createdAt: "2026-02-03" },
];

const products: Product[] = [
  {
    id: "p-1001", code: "ORS-260801", name: "可折叠硅胶宠物旅行碗", category: "宠物用品", expectedPrice: 18.99,
    sourceUrl: "https://www.1688.com/", notes: "轻量双碗套装，主打露营与车载场景。", submitterId: "u-dev-1", reviewerId: "u-op-1", status: "pending_review",
    submitTime: "2026-08-01 09:42", assignTime: "2026-08-01 10:05", attachments: [{ id: "a-1", name: "竞品分析.png", size: 782321, type: "image/png" }], reviews: [], objections: [],
  },
  {
    id: "p-1002", code: "ORS-260730", name: "磁吸式冰箱月历计划板", category: "家居收纳", expectedPrice: 24.99,
    notes: "含四色马克笔，亚克力透明面板。", submitterId: "u-dev-2", reviewerId: "u-op-2", status: "objection_pending",
    submitTime: "2026-07-30 14:23", assignTime: "2026-07-30 15:10", latestReviewTime: "2026-07-31 11:28", attachments: [{ id: "a-2", name: "市场容量.pdf", size: 916000, type: "application/pdf" }],
    reviews: [{ id: "r-1", round: 1, reviewerId: "u-op-2", decision: "returned", comment: "同质化较强，请补充差异化材质方案和包装成本测算。", createdAt: "2026-07-31 11:28" }],
    objections: [{ id: "o-1", roundId: "r-1", submitterId: "u-dev-2", content: "已找到防刮磨砂材质供应商，包装成本可降低 0.7 美元，并补充了新报价。", createdAt: "2026-08-01 09:10" }],
  },
  {
    id: "p-1003", code: "ORS-260729", name: "儿童浴室鲸鱼造型温度计", category: "母婴用品", expectedPrice: 15.99,
    notes: "食品级硅胶外壳，电子测温。", submitterId: "u-dev-1", reviewerId: "u-op-1", status: "approved",
    submitTime: "2026-07-29 10:06", assignTime: "2026-07-29 10:22", latestReviewTime: "2026-07-29 17:46", attachments: [],
    reviews: [{ id: "r-2", round: 1, reviewerId: "u-op-1", decision: "approved", comment: "需求稳定，竞争强度可控，注意完成 CPC 认证。", createdAt: "2026-07-29 17:46" }], objections: [],
  },
  {
    id: "p-1004", code: "ORS-260728", name: "露营灯串收纳卷轴", category: "户外运动", expectedPrice: 21.99,
    submitterId: "u-dev-3", reviewerId: "u-op-3", status: "rejected", submitTime: "2026-07-28 16:30", assignTime: "2026-07-28 17:00", latestReviewTime: "2026-07-29 14:15", attachments: [],
    reviews: [{ id: "r-3", round: 1, reviewerId: "u-op-3", decision: "rejected", comment: "头部 ASIN 评论壁垒过高，当前成本无法达到目标毛利。", createdAt: "2026-07-29 14:15" }], objections: [],
  },
  {
    id: "p-1005", code: "ORS-260727", name: "车载座椅缝隙收纳盒", category: "汽车用品", expectedPrice: 29.99,
    submitterId: "u-dev-2", reviewerId: "u-op-2", status: "returned", submitTime: "2026-07-27 11:18", assignTime: "2026-07-27 13:32", latestReviewTime: "2026-07-28 09:48", attachments: [],
    reviews: [{ id: "r-4", round: 1, reviewerId: "u-op-2", decision: "returned", comment: "请补充不同车型适配尺寸和退货风险评估。", createdAt: "2026-07-28 09:48" }], objections: [],
  },
  {
    id: "p-1006", code: "ORS-260726", name: "桌面理线器六枚装", category: "办公用品", expectedPrice: 12.99,
    submitterId: "u-dev-1", reviewerId: "u-op-1", status: "approved", submitTime: "2026-07-26 09:05", assignTime: "2026-07-26 09:41", latestReviewTime: "2026-07-26 16:12", attachments: [],
    reviews: [{ id: "r-5", round: 1, reviewerId: "u-op-1", decision: "approved", comment: "供应稳定，组合装定价有空间，建议先小批量测试。", createdAt: "2026-07-26 16:12" }], objections: [],
  },
  {
    id: "p-1007", code: "ORS-260725", name: "木质拼图收纳托盘", category: "玩具游戏", expectedPrice: 26.99,
    submitterId: "u-dev-3", status: "pending_assign", submitTime: "2026-07-25 15:44", attachments: [{ id: "a-3", name: "产品图.jpg", size: 456777, type: "image/jpeg" }], reviews: [], objections: [],
  },
  {
    id: "p-1008", code: "ORS-260724", name: "旅行首饰收纳册", category: "时尚配件", expectedPrice: 19.99,
    submitterId: "u-dev-2", reviewerId: "u-op-3", status: "redevelop", submitTime: "2026-07-24 13:12", assignTime: "2026-07-24 14:00", latestReviewTime: "2026-07-25 10:33", attachments: [],
    reviews: [{ id: "r-6", round: 1, reviewerId: "u-op-3", decision: "redevelop", comment: "现有内页结构容易缠绕，请完成二次结构开发后再提交。", createdAt: "2026-07-25 10:33" }], objections: [],
  },
  {
    id: "p-1009", code: "ORS-260722", name: "手冲咖啡滤纸便携盒", category: "厨具餐饮", expectedPrice: 16.99,
    submitterId: "u-dev-1", reviewerId: "u-op-2", status: "approved", submitTime: "2026-07-22 10:20", assignTime: "2026-07-22 10:45", latestReviewTime: "2026-07-23 09:20", attachments: [],
    reviews: [{ id: "r-7", round: 1, reviewerId: "u-op-2", decision: "approved", comment: "场景清晰，建议增加 01/02 两种规格。", createdAt: "2026-07-23 09:20" }], objections: [],
  },
];

export const seedState: AppState = {
  users: seedUsers,
  products,
  notices: [
    { id: "n-1", target: "赵可", event: "分配通知", content: "你有一个新选品待审核：可折叠硅胶宠物旅行碗", time: "2026-08-01 10:05", success: true },
    { id: "n-2", target: "王璐", event: "异议通知", content: "磁吸式冰箱月历计划板已提交异议，请复审", time: "2026-08-01 09:10", success: true },
  ],
};
