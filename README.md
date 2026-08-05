# ORS 选品审核中心

根据《选品审核系统 PRD / 技术设计 v1》实现的 Next.js + Ant Design 管理系统。实现时已将 PRD 中存在安全公告的 Next.js 14 升级为 Next.js 16。

## 已实现

- 三角色视角与权限菜单：管理员、开发人员、运营审核
- 新选品提交、附件选择、状态筛选和详情追踪
- 管理员人工分配与一键轮询分配
- 运营审核决策：通过、不通过、驳回补充、二次开发
- 开发异议提交与多轮复审闭环
- 联动统计看板、人员管理、通知日志
- Excel / CSV 解析、字段映射预览与历史数据导入
- 飞书、通知规则、自动分配设置界面
- Prisma PostgreSQL 数据模型
- 浏览器 `localStorage` 演示数据持久化

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。系统默认使用管理员“林晓”进入，可在右上角切换为开发或运营视角。右上角“恢复”按钮可重置演示数据。

## 生产接入

生产数据适配器已经实现，包括 Supabase Auth、Prisma PostgreSQL、私有 Storage、RBAC API、飞书通知与审计日志。默认仍使用 `demo` 模式，完成配置后再切换。

完整的分步操作、检查命令和故障提示见 [`docs/PRODUCTION_SETUP.md`](docs/PRODUCTION_SETUP.md)。数据库实体定义见 `prisma/schema.prisma`，附件桶初始化脚本见 `supabase/setup.sql`。
