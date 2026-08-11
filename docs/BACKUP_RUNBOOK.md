# ORS 备份与恢复演练手册

## 目标

- 数据库和私有附件必须同时备份；Supabase 数据库备份不包含 Storage 实际文件。
- 公司需确定 RPO/RTO。建议至少启用 Supabase Pro 每日备份，并把 ORS 加密备份复制到公司受控的异地存储。
- `ORS_BACKUP_ENCRYPTION_KEY` 必须保存在密码管理器或密钥管理服务中，不能提交到 Git。

## 创建并校验加密备份

生成 32 字节 Base64 密钥并安全保存（只需生成一次，遗失后无法恢复历史备份）：

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
[Convert]::ToBase64String($bytes)
```

在受控终端临时设置：

```powershell
$env:ORS_BACKUP_OUTPUT_DIR='E:\ORS-Backups'
$env:ORS_BACKUP_ENCRYPTION_KEY='<从密码管理器读取>'
npm run backup:create
npm run backup:verify -- 'E:\ORS-Backups\ors-YYYY-MM-DD...'
```

备份目录不能放在代码仓库内。脚本使用 AES-256-GCM 分文件加密并为每个文件生成 SHA-256 校验值。

## 恢复演练

每季度至少演练一次：

1. 新建一个空的 staging Supabase 项目，禁止指向 production。
2. 对 staging 执行 `npm run db:deploy` 和 `npm run supabase:setup`。
3. 运行 `backup:verify` 确认备份未损坏。
4. 在同一个受控 PowerShell 窗口中设置 staging 专用参数（密钥和连接信息不得发到聊天或写入仓库）：

```powershell
$env:ORS_RESTORE_SUPABASE_URL='https://<staging-ref>.supabase.co'
$env:ORS_RESTORE_SUPABASE_SERVICE_ROLE_KEY='<staging service role>'
$env:ORS_RESTORE_DATABASE_URL='<staging direct connection URL>'
$env:ORS_RESTORE_STORAGE_BUCKET='product-attachments'
$env:ORS_RESTORE_CONFIRM='RESTORE_TO_EMPTY_STAGING:<staging-ref>'
$env:ORS_BACKUP_ENCRYPTION_KEY='<从密码管理器读取>'
npm run backup:restore:staging -- 'E:\ORS-Backups\ors-YYYY-MM-DD...'
```

恢复命令会在写入前强制确认 staging 项目引用、拒绝生产项目、检查所有目标表和附件桶为空，并完整校验、解密后恢复 7 张业务表与私有附件。

5. 为 staging 创建独立的测试管理员，使用 staging 环境执行 `npm run production:check`、`npm run rbac:check` 和 `npm run flow-v2:check`。
6. 对比恢复命令输出的表记录数、附件数与备份清单，抽查产品、审核轮次、异议、审计日志和附件下载。
7. 记录恢复耗时、缺失数据和改进项，验证是否满足公司 RPO/RTO。

禁止直接在 production 上执行恢复演练。
