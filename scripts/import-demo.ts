import "./load-env";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPrisma } from "../lib/db";
import { hashPassword } from "../lib/security/password";
import { scalarData } from "./import-utils";
import type { AppState } from "../types";

async function main() {
  const inputArgs = process.argv.slice(2);
  if (!inputArgs.length || inputArgs.some((value) => !path.isAbsolute(value))) throw new Error("用法：npm run migrate:demo -- <导出 JSON 绝对路径> [更多员工电脑导出的 JSON...]");
  const temporaryPassword = process.env.MIGRATION_TEMP_PASSWORD;
  if (!temporaryPassword || temporaryPassword.length < 12) throw new Error("请设置至少 12 位的 MIGRATION_TEMP_PASSWORD");
  const states = await Promise.all(inputArgs.map(async (input) => JSON.parse(await readFile(input, "utf8")) as AppState));
  if (states.some((state) => !Array.isArray(state.users) || !Array.isArray(state.products))) throw new Error("演示数据格式无效");
  const db = getPrisma();
  if (await db.user.count() || await db.product.count()) throw new Error("演示数据迁移只允许导入空的 SQLite 业务库");

  const sharedUsers = new Map<string, { id: string; user: AppState["users"][number] }>();
  for (const state of states) for (const user of state.users) {
    const account = user.account.trim().toLowerCase();
    if (!sharedUsers.has(account)) sharedUsers.set(account, { id: randomUUID(), user });
  }
  const userRows: Array<Record<string, unknown>> = [];
  for (const [account, entry] of sharedUsers) userRows.push(scalarData("User", entry.user as unknown as Record<string, unknown>, { id: entry.id, loginName: account, passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true, passwordChangedAt: null }));

  const productRows: Array<Record<string, unknown>> = [];
  const reviewRows: Array<Record<string, unknown>> = [];
  const objectionRows: Array<Record<string, unknown>> = [];
  states.forEach((state, sourceIndex) => {
    const localUsers = new Map(state.users.map((user) => [user.id, sharedUsers.get(user.account.trim().toLowerCase())!.id]));
    for (const product of state.products) {
      const productId = randomUUID();
      const roundIds = new Map(product.reviews.map((review) => [review.id, randomUUID()]));
      productRows.push(scalarData("Product", product as unknown as Record<string, unknown>, {
        id: productId,
        code: sourceIndex ? `${product.code}-PC${sourceIndex + 1}` : product.code,
        submitterId: localUsers.get(product.submitterId),
        reviewerId: product.reviewerId ? localUsers.get(product.reviewerId) : null,
      }));
      reviewRows.push(...product.reviews.map((review) => scalarData("ReviewRound", review as unknown as Record<string, unknown>, { id: roundIds.get(review.id), productId, roundNumber: review.round, reviewerId: localUsers.get(review.reviewerId) })));
      objectionRows.push(...product.objections.map((objection) => scalarData("Objection", objection as unknown as Record<string, unknown>, { id: randomUUID(), productId, roundId: roundIds.get(objection.roundId), submitterId: localUsers.get(objection.submitterId) })));
    }
  });
  await db.$transaction(async (tx) => {
    await tx.user.createMany({ data: userRows as never });
    await tx.product.createMany({ data: productRows as never });
    await tx.reviewRound.createMany({ data: reviewRows as never });
    await tx.objection.createMany({ data: objectionRows as never });
  });
  console.log(`演示数据迁移完成：${inputArgs.length} 台电脑、${userRows.length} 个去重用户、${productRows.length} 个选品；浏览器演示附件只有元数据，未导入文件。`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
