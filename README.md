# ORS 选品审核中心

面向公司内网的单机自托管选品审核系统，基于 Next.js 16、Ant Design、Prisma 和 SQLite。

## 架构

- 本地账号、scrypt 密码哈希和数据库会话；不依赖邮件或云认证
- SQLite WAL 单实例数据库
- 服务器私有目录附件，下载前执行 RBAC 权限检查
- 管理员、开发、运营三角色完整审核流程
- 站内通知始终保留，飞书通知为可选增强
- SQLite Online Backup、附件备份清单和 SHA-256 校验
- PostgreSQL/Supabase 导出数据与浏览器演示数据迁移工具

## 开发启动

复制 `.env.example` 为 `.env.local`，开发环境可将 `ORS_DATA_DIR`、`ORS_BACKUP_DIR` 改为仓库下的临时目录，然后运行：

```powershell
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

首次管理员登录后必须修改临时密码。

## 常用命令

```powershell
npm run lint
npm run build
npm run selfhost:check
npm run backup:create
npm run backup:verify -- D:\ORS\backups\ors-...
npm run migrate:legacy -- D:\ORS\migration\business-export.json
npm run migrate:demo -- D:\ORS\migration\ors-demo-export.json
```

部署、备份与安全说明见：

- [Windows 11 自托管部署](docs/PRODUCTION_SETUP.md)
- [备份恢复手册](docs/BACKUP_RUNBOOK.md)
- [安全基线](docs/SECURITY_HARDENING.md)
