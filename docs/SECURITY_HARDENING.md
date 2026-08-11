# ORS 正式上线安全清单

## 已由代码强制执行

- 所有业务路由经过 Supabase 会话刷新，未登录页面跳转登录。
- API 写请求校验浏览器请求来源，阻止跨站写入。
- 登录失败按“账号 + IP”和 IP 两级限流，限流键只保存 SHA-256 哈希。
- CSP、HSTS、防 MIME 嗅探、防点击劫持、权限策略等响应头。
- 管理员支持 TOTP MFA；启用后服务端要求管理员会话达到 `aal2`。
- 业务数据表和登录限流表启用 RLS，并撤销浏览器角色直连权限。
- 依赖安全检查通过 GitHub CI，Dependabot 每周检查更新。

## 管理员 MFA 启用顺序

1. 保持 `NEXT_PUBLIC_REQUIRE_ADMIN_MFA=false` 部署一次含 MFA 页面的版本。
2. 管理员登录后访问 `/mfa`，用身份验证器扫码并完成绑定。
3. 至少准备两个可恢复的管理员账号，并安全保存恢复流程。
4. 将 Production 环境变量改为 `NEXT_PUBLIC_REQUIRE_ADMIN_MFA=true`，重新部署。
5. 运行 `npm run production:check`，确认输出“已强制管理员使用 TOTP 双重验证”。

## 外部平台必须人工完成

- GitHub、Vercel、Supabase 组织的所有 Owner 开启 MFA，至少保留两个公司 Owner。
- Supabase 开启数据库 SSL Enforcement 和适合部署网络的 Network Restrictions。
- Service Role、数据库密码、飞书 Secret 只保存在部署平台加密变量；上线前轮换一次，后续至少每 90 天复核。
- Vercel Preview 与 Production 使用不同 Supabase 项目和不同密钥。
- 配置错误率、健康检查、数据库容量、连接数与备份失败告警。

## 内部账号发放策略

- 仅内部使用时设置 `AUTH_EMAIL_DELIVERY_REQUIRED=false`，由管理员在“用户管理”中直接创建账号并设置至少 12 位初始密码。
- 账号与初始密码应通过公司认可的安全渠道分别发放，不得使用共享账号或在群聊中明文发送密码。
- 如果以后启用邀请邮件或密码重置邮件，将 `AUTH_EMAIL_DELIVERY_REQUIRED=true`，并在 Supabase 配置企业 SMTP 后设置 `AUTH_CUSTOM_SMTP_CONFIGURED=true`。

## 严格上线门禁

完成账号发放策略确认、MFA 和备份演练后设置。以下示例适用于不使用邮件的内部账号模式：

```env
NEXT_PUBLIC_REQUIRE_ADMIN_MFA=true
AUTH_EMAIL_DELIVERY_REQUIRED=false
AUTH_CUSTOM_SMTP_CONFIGURED=false
BACKUP_POLICY_CONFIGURED=true
PRODUCTION_READINESS_STRICT=true
```

此后 `npm run production:check` 会把未完成项作为失败返回，避免误上线。
