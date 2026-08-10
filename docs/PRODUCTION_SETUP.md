# 生产接入操作手册

系统默认保持 `demo` 模式。以下步骤完成前，不会读取或写入任何云端数据。

## 步骤 1：创建 Supabase 项目

1. 在 Supabase 创建项目，区域选择离主要使用者最近的位置。
2. 在项目的 Connect / API 设置中准备：
   - Project URL
   - Publishable Key
   - Service Role Key（只能放服务端环境变量）
3. 在 Database 连接设置中准备：
   - Transaction Pooler URL，供 `DATABASE_URL` 使用
   - Direct connection URL，供 `DIRECT_URL` 和迁移使用
4. 在 Authentication → URL Configuration 中把本地与正式地址加入 Redirect URLs。
5. 在 Authentication → Email Templates → Invite user 中，将邀请按钮链接改为：

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/set-password">
  接受邀请并设置密码
</a>
```

这是 Supabase SSR 流程所需的 Token Hash 交换入口；默认的 URL Fragment 无法被服务端读取。

提示：不要把 Service Role Key、数据库密码或飞书 Secret 发到聊天里。请直接写入本机 `.env.local` 或部署平台的加密环境变量。

完成提示语：`步骤 1 已完成，Supabase 项目和 5 项连接参数已准备好。`

## 步骤 2：填写本地生产配置

```powershell
Copy-Item .env.example .env.local
```

编辑 `.env.local`，至少填写：

```env
NEXT_PUBLIC_APP_MODE=production
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...transaction pooler...
DIRECT_URL=...direct connection 或 5432 session pooler...
SUPABASE_STORAGE_BUCKET=product-attachments
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_REQUIRE_ADMIN_MFA=false
AUTH_CUSTOM_SMTP_CONFIGURED=false
BACKUP_POLICY_CONFIGURED=false
PRODUCTION_READINESS_STRICT=false
```

注意：数据库密码包含 `@`、`#`、`%` 等字符时必须进行 URL 编码。

完成提示语：`步骤 2 已完成，.env.local 已填写且未提交到 Git。`

## 步骤 3：部署数据库结构

```powershell
npm run db:generate
npm run db:deploy
```

`db:deploy` 只会执行仓库中的版本化迁移；请确认输出包含 `202608010001_init`。

完成提示语：`步骤 3 已完成，Prisma 初始迁移已部署。`

## 步骤 4：创建私有附件桶

运行可重复执行的初始化命令：

```powershell
npm run supabase:setup
```

该命令通过 `DIRECT_URL` 执行 `supabase/setup.sql`。如部署环境不允许运行脚本，也可在 Supabase Dashboard → SQL Editor 中手动执行同一文件。

该脚本会创建：

- 私有桶 `product-attachments`
- 单文件 10MB 限制（与服务端上传校验保持一致）
- JPG、PNG、PDF 类型限制
- 为全部业务表启用 RLS，并撤销 `anon` / `authenticated` 的直接表权限

业务数据仅通过 Next.js Route Handlers + Prisma 访问，避免浏览器绕过 RBAC。附件仅通过服务端 Service Role 上传；下载地址有效期为 60 秒。Service Role 永远不能放入 `NEXT_PUBLIC_*` 变量。

完成提示语：`步骤 4 已完成，product-attachments 私有桶已创建。`

## 步骤 5：初始化首个管理员

在 `.env.local` 中设置：

```env
BOOTSTRAP_ADMIN_EMAIL=你的管理员邮箱
BOOTSTRAP_ADMIN_PASSWORD=至少12位的临时强密码
BOOTSTRAP_ADMIN_NAME=管理员姓名
```

运行：

```powershell
npm run db:seed
npm run admin:check
npm run auth:check
```

`admin:check` 只输出管理员同步状态和数量，不输出个人信息；`auth:check` 使用 Publishable Key 验证一次真实密码登录并立即关闭测试会话。

验证邀请与开发人员权限时，可在 `.env.local` 临时设置 `INVITE_TEST_NAME`、`INVITE_TEST_EMAIL`、`INVITE_TEST_ROLE` 和 `INVITE_TEST_PASSWORD`，然后运行：

```powershell
npm run invite:check
npm run invite:resend
npm run test-user:check
npm run rbac:check
```

`rbac:check` 会验证开发人员无法访问管理员用户 API、只能访问允许的产品 API，并确认引导数据不会暴露无关用户邮箱。测试凭据不得配置到正式部署环境。

首次登录后应立即在 Supabase Auth 中更新临时密码。后续普通用户通过系统“用户管理”发送 Supabase 邀请邮件创建。

### 管理员 MFA 与企业 SMTP

1. 先保持 `NEXT_PUBLIC_REQUIRE_ADMIN_MFA=false`，管理员登录后访问 `/mfa` 完成 TOTP 绑定。
2. 所有管理员完成绑定后，把 `NEXT_PUBLIC_REQUIRE_ADMIN_MFA` 改为 `true` 并重新部署。
3. 在 Supabase Authentication → Emails → SMTP Settings 配置公司的 SMTP 服务，关闭邮件链接追踪，并完成真实邀请和密码重置测试。
4. 验证成功后设置 `AUTH_CUSTOM_SMTP_CONFIGURED=true`。

详细安全清单见 [`docs/SECURITY_HARDENING.md`](SECURITY_HARDENING.md)。

完成提示语：`步骤 5 已完成，首个管理员可以登录。`

## 步骤 6：接入飞书通知（可选）

1. 在飞书开放平台创建企业自建应用并启用机器人。
2. 开通 `im:message:send_as_bot` 权限并发布应用版本。
3. 将凭据放入 `.env.local`：

```env
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
```

4. 在用户管理中填写用户的飞书 Open ID。

未配置飞书不会阻塞审核流程；通知会写入 `notification_log`，状态为 `skipped`。

完成提示语：`步骤 6 已完成，飞书应用已发布且用户 Open ID 已绑定。`

## 步骤 7：执行生产自检

```powershell
npm run production:check
npm run security:check
npm run build
npm run dev
```

浏览器验证：

1. `/api/health` 返回 `database: connected`
2. 管理员可以登录并邀请用户
3. 开发人员只能看到自己的选品
4. 运营只能审核分配给自己的选品
5. 附件可上传，并通过短时签名地址下载
6. 驳回 → 异议 → 复审可以完成多轮流转
7. 管理员访问 `/mfa` 可以绑定并验证 TOTP
8. 企业 SMTP 的邀请邮件与密码重置邮件可以到达

数据库与附件备份按 [`docs/BACKUP_RUNBOOK.md`](BACKUP_RUNBOOK.md) 执行。首次备份和恢复演练通过后设置 `BACKUP_POLICY_CONFIGURED=true`。正式上线前再设置 `PRODUCTION_READINESS_STRICT=true`，确保任何未完成项都会使自检失败。

完成提示语：`步骤 7 已完成，生产自检和核心流程验收通过。`

## 步骤 8：部署

在 Vercel 或等价的 Node.js 托管平台配置与 `.env.local` 相同的环境变量，但：

- `NEXT_PUBLIC_APP_URL` 改为正式 HTTPS 域名
- Preview 与 Production 使用不同的 Supabase 项目
- Build Command 使用 `npm run build`
- 部署前执行 `npm run db:deploy`

上线后不要使用 `prisma migrate dev`；生产环境只使用 `prisma migrate deploy`。

完成提示语：`步骤 8 已完成，正式域名健康检查通过。`

## 故障提示

- 登录后提示“尚未加入系统”：Supabase Auth 用户存在，但 `public.users` 没有相同 UUID；重新运行 `npm run db:seed` 或由管理员邀请。
- 迁移出现 prepared statement / lock 错误：`DIRECT_URL` 误用了 Transaction Pooler。
- 接口出现连接数耗尽：`DATABASE_URL` 误用了 Direct URL，或未设置连接限制。
- 附件上传失败：检查是否执行 `supabase/setup.sql`，以及桶名是否与环境变量一致。
- 飞书通知失败：检查应用是否已发布、权限是否审批、用户字段是否为 Open ID。
