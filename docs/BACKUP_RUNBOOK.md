# 备份与恢复手册

## 创建

```powershell
npm run backup:create
```

脚本使用 SQLite Online Backup API 生成一致性的 `ors.db` 快照，再复制 `uploads`，为每个文件写入大小和 SHA-256 清单。保留策略为最近 7 个日备份、4 个周备份和 12 个按月备份的并集。

建议用 Windows 任务计划程序每天执行，并至少将一份完整备份复制到另一台受控设备或移动硬盘。升级前手工再执行一次。

可在每日备份前运行 `npm run storage:cleanup`，重试删除草稿或回滚上传时记录的待清理附件。

## 校验

```powershell
npm run backup:verify -- D:\ORS\backups\ors-2026-...
```

校验包括清单路径边界、文件大小、SHA-256 和 SQLite `PRAGMA integrity_check`。

## 恢复到空目录

1. 停止 ORS 服务。
2. 将原数据目录整体重命名留作安全副本。
3. 创建空的 `ORS_DATA_DIR`。
4. 执行：

```powershell
$env:ORS_SERVICE_STOPPED='true'
$env:ORS_RESTORE_CONFIRM='RESTORE_TO_EMPTY_DATA_DIR'
npm run backup:restore -- D:\ORS\backups\ors-2026-...
```

5. 再运行 `npm run selfhost:check`，启动服务并完成登录、附件下载和关键流程抽查。

恢复脚本拒绝覆盖非空数据目录，避免误伤现有数据。每季度至少执行一次恢复演练。
