# 自托管安全基线

- 密码使用带随机盐的 scrypt，不保存明文或可逆密码。
- Cookie 使用 `HttpOnly`、`SameSite=Lax`；当前 HTTP 内网方案设置 `ORS_COOKIE_SECURE=false`。
- 所有写请求经过 Origin/Host 与 `Sec-Fetch-Site` 校验。
- 会话原始令牌仅存在 Cookie，SQLite 只保存 SHA-256；登出、改密、停用账号立即撤销会话。
- 管理员创建用户时发放临时密码，用户首次登录必须修改。
- 附件位于 `public` 目录之外；扩展名、MIME、文件签名、大小和产品权限同时校验。
- 下载路径使用 `path.resolve` 边界检查，响应设置 `nosniff` 和 `no-store`。
- HTTP 无法防止同一网络中的被动监听。应使用受控交换机/VLAN、专用网络防火墙规则和可信终端；未来启用 HTTPS 时将 `ORS_COOKIE_SECURE=true`。
- SQLite 仅支持单写入者；保持单实例，并监控 `SQLITE_BUSY`、磁盘剩余空间和备份结果。
- 飞书凭据只存服务端环境变量。留空时不连接互联网，站内通知仍记录。
