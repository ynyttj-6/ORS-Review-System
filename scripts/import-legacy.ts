import "./load-env";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPrisma } from "../lib/db";
import { hashPassword } from "../lib/security/password";
import { removeStoredFile, storeFile } from "../lib/self-hosted/storage";
import { type LegacyExport, scalarData } from "./import-utils";

function rows(data: LegacyExport, camel: keyof LegacyExport, snake: keyof LegacyExport) {
  return (data[camel] || data[snake] || []) as Array<Record<string, unknown>>;
}

async function main() {
  const inputArg = process.argv[2];
  if (!inputArg || !path.isAbsolute(inputArg)) throw new Error("用法：npm run migrate:legacy -- <业务表 JSON 绝对路径>");
  const temporaryPassword = process.env.MIGRATION_TEMP_PASSWORD;
  if (!temporaryPassword || temporaryPassword.length < 12) throw new Error("请设置至少 12 位的 MIGRATION_TEMP_PASSWORD；所有迁移用户首次登录后必须改密");
  const data = JSON.parse(await readFile(inputArg, "utf8")) as LegacyExport;
  const users = data.users || [];
  const products = data.products || [];
  const reviews = rows(data, "reviewRounds", "review_rounds");
  const objections = data.objections || [];
  const attachments = data.attachments || [];
  const auditLogs = rows(data, "auditLogs", "audit_log");
  const notificationLogs = rows(data, "notificationLogs", "notification_log");
  if (!users.length) throw new Error("迁移文件未包含 users 数据");
  const db = getPrisma();
  const existing = await Promise.all([db.user.count(), db.product.count(), db.attachment.count()]);
  if (existing.some(Boolean)) throw new Error("迁移只允许导入空的 SQLite 业务库");

  const userRows: Array<Record<string, unknown>> = [];
  for (const row of users) userRows.push(scalarData("User", row, { loginName: row.loginName || row.login_name || row.email, passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true, passwordChangedAt: null }));

  const sourceUploads = process.env.LEGACY_UPLOADS_DIR ? path.resolve(process.env.LEGACY_UPLOADS_DIR) : null;
  if (attachments.length && !sourceUploads) throw new Error("迁移包含附件，请设置 LEGACY_UPLOADS_DIR 指向已下载的旧 Storage 根目录");
  const stagedPaths: string[] = [];
  const attachmentRows: Array<Record<string, unknown>> = [];
  try {
    for (const row of attachments) {
      const oldRelative = String(row.filePath || row.file_path || "");
      const source = path.resolve(sourceUploads!, oldRelative);
      if (source !== sourceUploads && !source.startsWith(`${sourceUploads}${path.sep}`)) throw new Error(`旧附件路径越界：${oldRelative}`);
      const bytes = await readFile(source);
      const stored = await storeFile(String(row.productId || row.product_id), String(row.fileName || row.file_name), bytes);
      stagedPaths.push(stored.relativePath);
      attachmentRows.push(scalarData("Attachment", row, { filePath: stored.relativePath, sha256: stored.sha256, fileSize: bytes.length }));
    }
    await db.$transaction(async (tx) => {
      await tx.user.createMany({ data: userRows as never });
      await tx.product.createMany({ data: products.map((row) => scalarData("Product", row)) as never });
      await tx.reviewRound.createMany({ data: reviews.map((row) => scalarData("ReviewRound", row)) as never });
      await tx.objection.createMany({ data: objections.map((row) => scalarData("Objection", row)) as never });
      await tx.attachment.createMany({ data: attachmentRows as never });
      await tx.auditLog.createMany({ data: auditLogs.map((row) => scalarData("AuditLog", row)) as never });
      await tx.notificationLog.createMany({ data: notificationLogs.map((row) => scalarData("NotificationLog", row)) as never });
    });
  } catch (error) {
    await Promise.all(stagedPaths.map((filePath) => removeStoredFile(filePath).catch(() => undefined)));
    throw error;
  }
  const actual = await Promise.all([db.user.count(), db.product.count(), db.reviewRound.count(), db.objection.count(), db.attachment.count(), db.auditLog.count(), db.notificationLog.count()]);
  const expected = [users.length, products.length, reviews.length, objections.length, attachments.length, auditLogs.length, notificationLogs.length];
  if (actual.some((value, index) => value !== expected[index])) throw new Error(`迁移后记录数不一致：期望 ${expected.join("/")}，实际 ${actual.join("/")}`);
  console.log(`旧系统数据迁移完成：用户/选品/审核/异议/附件/审计/通知 = ${actual.join("/")}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
