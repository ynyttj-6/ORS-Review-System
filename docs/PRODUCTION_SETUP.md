# Windows 11 自托管部署

## 1. 目录与环境

推荐目录：

```text
D:\ORS\app\       程序版本
D:\ORS\data\      ors.db、uploads、tmp
D:\ORS\backups\   一致性备份
```

数据目录必须位于服务器本机 NTFS 磁盘，不能放在 NAS、共享文件夹、OneDrive 或其他同步目录。

安装 Node.js LTS，复制 `.env.example` 为 `.env.local`，至少设置：

```dotenv
ORS_DATA_DIR=D:\ORS\data
ORS_BACKUP_DIR=D:\ORS\backups
DATABASE_URL=file:D:/ORS/data/ors.db
NEXT_PUBLIC_APP_URL=http://192.168.1.10:3000
ORS_COOKIE_SECURE=false
```

## 2. 初始化和构建

```powershell
npm ci
npm run db:deploy
npm run db:seed
npm run build
npm run selfhost:check
```

系统只能启动一个实例。禁止 PM2 cluster、多容器副本或多台服务器共享同一个 SQLite 文件。

## 3. 启动与开机运行

交互测试：

```powershell
$env:HOSTNAME='0.0.0.0'
$env:PORT='3000'
npm run start
```

管理员 PowerShell 中注册计划任务：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\install-task.ps1 -AppRoot D:\ORS\app -Port 3000
```

脚本创建名为 `ORS Self Hosted` 的开机任务并以隐藏窗口运行。Windows 防火墙仅应对“专用网络”和明确的公司内网网段开放 TCP 3000。

## 4. 数据迁移

### PostgreSQL/Supabase 业务数据

将 7 张业务表导出为一个 JSON 对象：`users`、`products`、`review_rounds`、`objections`、`attachments`、`audit_log`、`notification_log`。从 Storage 下载附件，保持数据库 `file_path` 对应的相对目录结构。

在空 SQLite 库上运行：

```powershell
$env:MIGRATION_TEMP_PASSWORD='统一的至少12位临时密码'
$env:LEGACY_UPLOADS_DIR='D:\ORS\migration\uploads'
npm run migrate:legacy -- D:\ORS\migration\business-export.json
```

脚本保留 UUID 和关系，复制附件并重新计算 SHA-256，最后核对各表记录数。旧 Supabase 密码哈希不会迁移，所有用户首次登录必须修改临时密码。

### 浏览器演示数据

员工在原来使用演示模式的同一浏览器和域名访问 `/tools/export-demo` 下载 JSON。每台电脑分别导出。管理员可一次传入多个文件，脚本会按账号去重用户并为不同电脑的重复产品编号添加来源后缀：

```powershell
$env:MIGRATION_TEMP_PASSWORD='统一的至少12位临时密码'
npm run migrate:demo -- D:\ORS\migration\pc1.json D:\ORS\migration\pc2.json
```

演示模式附件只有元数据，没有可恢复的文件内容，因此不会导入附件。

## 5. 验收

- `/api/health` 返回 `mode=self-hosted`、`database=connected`
- 管理员、开发、运营分别验证菜单和 API 权限
- 临时密码首次登录跳转改密，改密后旧会话失效
- 上传 JPG/PNG/PDF，验证错误扩展名、伪造 MIME、超过 10MB 和无权限下载被拒绝
- 完成提交、分配、审核、异议、复审流程
- 无互联网时核心流程正常；未配置飞书时站内通知仍存在
- 创建备份并在空数据目录执行恢复演练
