import "./load-env";

import { randomUUID } from "node:crypto";
import process from "node:process";
import { createServerClient } from "@supabase/ssr";
import { getPrisma } from "../lib/db";

type CookieRecord = { name: string; value: string; options?: Record<string, unknown> };

async function main() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!appUrl || !supabaseUrl || !publishableKey || !adminEmail || !adminPassword) throw new Error("v2 流程检查配置不完整");

  const adminCookies = new Map<string, CookieRecord>();
  const adminClient = createServerClient(supabaseUrl, publishableKey, { cookies: { getAll: () => [...adminCookies.values()], setAll: (items) => items.forEach((item) => adminCookies.set(item.name, item)) } });
  const { error: adminError } = await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (adminError) throw adminError;
  const adminCookie = [...adminCookies.values()].map(({ name, value }) => `${name}=${value}`).join("; ");
  const suffix = Date.now().toString(36);
  const password = `FlowV2-${randomUUID()}!Aa1`;
  let developerId: string | undefined;
  let operatorId: string | undefined;
  let replacementOperatorId: string | undefined;
  let productId: string | undefined;
  let stage = "初始化";

  const request = (path: string, cookie: string, init: RequestInit = {}) => fetch(new URL(path, appUrl), { ...init, headers: { ...init.headers, cookie } });
  const jsonRequest = (path: string, cookie: string, body: unknown, method = "POST") => request(path, cookie, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const expectData = async <T>(response: Response) => {
    const payload = await response.json() as { data?: T; error?: string };
    if (!response.ok || !payload.data) {
      if (stage === "创建草稿" && developerId) {
        try {
          const diagnostic = await getPrisma().product.create({ data: { code: `DIAG-${suffix}`, name: "v2全链路验收选品", category: null, sourceUrl: null, status: "draft", submitterId: developerId } });
          productId = diagnostic.id;
          throw new Error(`${stage}：接口失败但数据库直写成功，请检查路由数据映射`);
        } catch (diagnosticError) {
          if (diagnosticError instanceof Error && diagnosticError.message.includes("接口失败但数据库直写成功")) throw diagnosticError;
          throw new Error(`${stage}：${payload.error || response.status}；数据库诊断：${diagnosticError instanceof Error ? diagnosticError.message : String(diagnosticError)}`);
        }
      }
      throw new Error(`${stage}：${payload.error || `${response.url} 返回 ${response.status}`}`);
    }
    return payload.data;
  };
  const login = async (account: string) => {
    const response = await fetch(new URL("/api/auth/login", appUrl), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account, password }) });
    if (!response.ok) throw new Error(`临时账号登录失败：${response.status}`);
    return response.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
  };

  try {
    stage = "创建开发账号";
    const developer = await expectData<{ id: string; account: string }>(await jsonRequest("/api/users", adminCookie, { name: "v2流程开发", account: `flow-dev-${suffix}`, password, role: "developer" }));
    developerId = developer.id;
    stage = "创建运营账号";
    const operator = await expectData<{ id: string; account: string }>(await jsonRequest("/api/users", adminCookie, { name: "v2流程运营", account: `flow-op-${suffix}`, password, role: "operator" }));
    operatorId = operator.id;
    stage = "创建接替运营账号";
    const replacementOperator = await expectData<{ id: string; account: string }>(await jsonRequest("/api/users", adminCookie, { name: "v2流程接替运营", account: `flow-op2-${suffix}`, password, role: "operator" }));
    replacementOperatorId = replacementOperator.id;
    const developerCookie = await login(developer.account);
    const operatorCookie = await login(operator.account);
    const replacementOperatorCookie = await login(replacementOperator.account);

    stage = "创建草稿";
    const draft = await expectData<{ id: string; status: string }>(await jsonRequest("/api/products", developerCookie, { name: "v2全链路验收选品", action: "draft" }));
    productId = draft.id;
    stage = "再次编辑草稿";
    const editedDraft = await expectData<{ id: string; name: string; status: string }>(await jsonRequest(`/api/products/${productId}`, developerCookie, { name: "v2全链路验收选品-草稿已编辑", notes: "验证已保存草稿可以再次编辑" }, "PATCH"));
    const fields = {
      name: "v2全链路验收选品", category: "办公用品", competitorLink: "https://www.amazon.com/dp/B000000000", competitorAsins: "B000000001,B000000002", coreKeyword: "workflow test product", priceRange: "9.99-19.99", topCompetitorLink: "https://www.amazon.com/dp/B000000003",
      seasonality: "全年稳定，季节波动较低", usageScenario: "家庭与办公室日常使用", iterationPlan: "增加配置并改善竞品主要差评，保持价格竞争力", targetAudience: "办公人群", certification: "无", patentStatus: "已完成初步排查", trademarkStatus: "已完成核心词排查", competitorReviewsAnalysis: "已分析四个竞品，集中问题为包装、耐用性、气味和尺寸", visualUpgradeDirection: "简洁中性色", copyrightCheck: "自有设计并保留源文件", troCheck: "已完成关键词和图案特征排查", phraseTrademarkCheck: "无短句", packaging: "定制开窗彩盒", supplyChainAdvantage: "48小时出样",
      suggestedQuantity: 60, suggestedPrice: 16.99, minPrice: 14.99, productCostCny: 12.5, supplierName: "v2验收供应商", moq: 10, unitPrice: "12.5（含包装）", productionTime: "48h", supplierLink: "https://detail.1688.com/offer/100000000.html", supplierRemark: "测试数据", lengthCm: 15, widthCm: 10, heightCm: 2, weightG: 180, commissionRate: 0.15, exchangeRate: 7.2, shippingCost: 0.8, inventoryQuantity: 60,
    };
    stage = "补全草稿";
    await expectData(await jsonRequest(`/api/products/${productId}`, developerCookie, fields, "PATCH"));
    stage = "提交草稿";
    const submitted = await expectData<{ status: string; fbaFee?: number; profitMargin?: number }>(await request(`/api/products/${productId}/submit`, developerCookie, { method: "POST" }));
    stage = "分配运营";
    await expectData(await jsonRequest(`/api/products/${productId}/assign`, adminCookie, { reviewerId: operatorId }));
    stage = "更改已分配审核人";
    const reassigned = await expectData<{ status: string; reviewerId?: string }>(await jsonRequest(`/api/products/${productId}/assign`, adminCookie, { reviewerId: replacementOperatorId }));
    stage = "阻止重复指定相同审核人";
    const sameReviewerAttempt = await jsonRequest(`/api/products/${productId}/assign`, adminCookie, { reviewerId: replacementOperatorId });
    stage = "阻止原审核人继续审核";
    const previousReviewerAttempt = await jsonRequest(`/api/products/${productId}/review`, operatorCookie, { decision: "redevelop", comment: "原审核人不应再能审核该选品" });
    stage = "首轮驳回";
    const returned = await expectData<{ status: string; reviews: Array<{ id: string; decision: string; editCount?: number }> }>(await jsonRequest(`/api/products/${productId}/review`, replacementOperatorCookie, { decision: "redevelop", comment: "需要补充材料和价格竞争力依据", improvementSuggestions: "补充供应商打样与差评对应关系" }));
    const firstReviewId = returned.reviews.at(-1)?.id;
    if (!firstReviewId) throw new Error("首轮审核没有返回审核记录");
    stage = "阻止开发修改审核";
    const developerReviewAttempt = await jsonRequest(`/api/products/${productId}/review/${firstReviewId}`, developerCookie, { decision: "rejected", comment: "开发人员无权修改审核结果" }, "PATCH");
    stage = "修改历史审核结果";
    const corrected = await expectData<{ status: string; reviews: Array<{ id: string; decision: string; editCount?: number }> }>(await jsonRequest(`/api/products/${productId}/review/${firstReviewId}`, replacementOperatorCookie, { decision: "rejected", comment: "复核后调整为不通过，资料依据暂不充分" }, "PATCH"));
    stage = "恢复审核结果";
    const restored = await expectData<{ status: string; reviews: Array<{ id: string; decision: string; editCount?: number }> }>(await jsonRequest(`/api/products/${productId}/review/${firstReviewId}`, replacementOperatorCookie, { decision: "redevelop", comment: "再次核对后仍需补充材料和价格竞争力依据", improvementSuggestions: "补充供应商打样与差评对应关系" }, "PATCH"));
    stage = "提交异议";
    const objected = await expectData<{ status: string }>(await jsonRequest(`/api/products/${productId}/objection`, developerCookie, { hasObjection: true, content: "已补充供应商打样结果与四个竞品差评的对应改进数据。" }));
    stage = "复审通过";
    const approved = await expectData<{ status: string; launchDate?: string; firstBatchQuantity?: number }>(await jsonRequest(`/api/products/${productId}/review`, replacementOperatorCookie, { decision: "approved", comment: "补充资料完整，同意进入上架流程", launchDate: "2026-09-01", firstBatchQuantity: 80, marketAnalysis: "市场体量稳定", competitivenessAnalysis: "改进方案具备竞争力", alternativeSuggestions: "首批小批量验证" }));
    stage = "阻止运营撤回选品";
    const operatorReopenAttempt = await request(`/api/products/${productId}/reopen`, operatorCookie, { method: "POST" });
    stage = "撤回历史选品";
    const reopened = await expectData<{ status: string; revision?: number; reviewerId?: string; reviews: unknown[]; objections: unknown[] }>(await request(`/api/products/${productId}/reopen`, developerCookie, { method: "POST" }));
    stage = "修改历史选品";
    const historicalEdit = await expectData<{ status: string; revision?: number; notes?: string }>(await jsonRequest(`/api/products/${productId}`, developerCookie, { notes: "历史选品修改后重新提交" }, "PATCH"));
    stage = "重新提交历史选品";
    const resubmitted = await expectData<{ status: string; revision?: number; notes?: string; reviews: unknown[]; objections: unknown[] }>(await request(`/api/products/${productId}/submit`, developerCookie, { method: "POST" }));

    const stored = await getPrisma().product.findUnique({ where: { id: productId }, include: { reviews: true, objections: true, auditLogs: true } });
    const status = {
      draftCreated: draft.status === "draft",
      savedDraftCanBeEdited: editedDraft.id === draft.id && editedDraft.status === "draft" && editedDraft.name === "v2全链路验收选品-草稿已编辑",
      submittedAndCalculated: submitted.status === "pending_assign" && Number(submitted.fbaFee) > 0 && typeof submitted.profitMargin === "number",
      assignedReviewerCanBeChanged: reassigned.status === "pending_review" && reassigned.reviewerId === replacementOperatorId,
      sameReviewerCannotBeAssignedAgain: sameReviewerAttempt.status === 409,
      previousReviewerLosesAccess: previousReviewerAttempt.status === 403,
      redevelopWaitsForDeveloper: returned.status === "objection_pending",
      developerCannotEditReview: developerReviewAttempt.status === 403,
      reviewResultCanBeEdited: corrected.status === "rejected" && corrected.reviews.at(-1)?.decision === "rejected" && corrected.reviews.at(-1)?.editCount === 1,
      reviewResultCanBeCorrectedAgain: restored.status === "objection_pending" && restored.reviews.at(-1)?.decision === "redevelop" && restored.reviews.at(-1)?.editCount === 2,
      objectionReturnsToReview: objected.status === "pending_review",
      finalApprovalStored: approved.status === "approved" && approved.launchDate === "2026-09-01" && approved.firstBatchQuantity === 80,
      operatorCannotReopenProduct: operatorReopenAttempt.status === 403,
      historicalProductCanBeReopened: reopened.status === "draft" && reopened.revision === 2 && !reopened.reviewerId && reopened.reviews.length === 2 && reopened.objections.length === 1,
      historicalProductCanBeEdited: historicalEdit.status === "draft" && historicalEdit.revision === 2 && historicalEdit.notes === "历史选品修改后重新提交",
      historicalProductCanBeResubmitted: resubmitted.status === "pending_assign" && resubmitted.revision === 2 && resubmitted.notes === "历史选品修改后重新提交",
      completeHistoryStored: stored?.reviews.length === 2 && stored.objections.length === 1 && stored.finalDecision === null && resubmitted.reviews.length === 2 && resubmitted.objections.length === 1,
      changeAuditStored: stored?.auditLogs.filter((log) => log.action === "review_update").length === 2 && stored.auditLogs.some((log) => log.action === "reopen_for_resubmit") && stored.auditLogs.some((log) => log.action === "reassign"),
      productAnalysisStored: stored?.competitorReviewsAnalysis?.includes("四个竞品") === true && stored.packaging === "定制开窗彩盒",
    };
    stage = "结果校验";
    console.log(JSON.stringify(status));
    if (!Object.values(status).every(Boolean)) process.exitCode = 1;
  } finally {
    if (!productId) {
      const orphan = await getPrisma().product.findFirst({ where: { name: "v2全链路验收选品", submitterId: developerId }, orderBy: { createdAt: "desc" } }).catch(() => null);
      if (orphan) { console.error(`诊断：草稿已写入但接口序列化失败，状态=${orphan.status}`); productId = orphan.id; }
    }
    if (productId) await getPrisma().product.delete({ where: { id: productId } }).catch(() => undefined);
    if (developerId) await request(`/api/users/${developerId}`, adminCookie, { method: "DELETE" }).catch(() => undefined);
    if (operatorId) await request(`/api/users/${operatorId}`, adminCookie, { method: "DELETE" }).catch(() => undefined);
    if (replacementOperatorId) await request(`/api/users/${replacementOperatorId}`, adminCookie, { method: "DELETE" }).catch(() => undefined);
    await adminClient.auth.signOut({ scope: "local" }).catch(() => undefined);
    await getPrisma().$disconnect().catch(() => undefined);
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "v2 流程检查失败");
  await getPrisma().$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
