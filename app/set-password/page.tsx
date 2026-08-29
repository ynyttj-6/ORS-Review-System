"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, ConfigProvider, Form, Input, Typography } from "antd";
import { LockOutlined, ProductOutlined } from "@ant-design/icons";
import zhCN from "antd/locale/zh_CN";

const { Title, Text } = Typography;

export default function SetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async ({ currentPassword, password }: { currentPassword?: string; password: string }) => {
    setLoading(true); setError("");
    const response = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword: password }) });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    setLoading(false);
    if (!response.ok) { setError(payload.error || "密码修改失败"); return; }
    router.replace("/dashboard"); router.refresh();
  };
  return <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: "#3b5ccc", borderRadius: 10 } }}><main className="login-page"><section className="login-story"><div className="login-brand"><span><ProductOutlined /></span>ORS 选品审核中心</div><div><Text>ACCOUNT SECURITY</Text><Title>保护你的账号，<br />从一个好密码开始。</Title><p>首次登录可直接设置新密码；日后修改时请输入当前密码。</p></div><div /></section><section className="login-panel"><Card className="login-card"><Title level={3}>修改登录密码</Title><Text type="secondary">密码至少 12 位，建议包含大小写字母、数字与符号</Text>{error && <Alert type="error" showIcon message="设置失败" description={error} />}<Form layout="vertical" onFinish={submit} requiredMark={false}><Form.Item label="当前密码（首次登录可留空）" name="currentPassword"><Input.Password size="large" prefix={<LockOutlined />} autoComplete="current-password" /></Form.Item><Form.Item label="新密码" name="password" rules={[{ required: true }, { min: 12, message: "密码至少 12 位" }]}><Input.Password size="large" prefix={<LockOutlined />} autoComplete="new-password" /></Form.Item><Form.Item label="确认密码" name="confirm" dependencies={["password"]} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue("password") === value ? Promise.resolve() : Promise.reject(new Error("两次输入的密码不一致")); } })]}><Input.Password size="large" prefix={<LockOutlined />} autoComplete="new-password" /></Form.Item><Button type="primary" size="large" htmlType="submit" loading={loading} block>保存密码并进入系统</Button></Form></Card></section></main></ConfigProvider>;
}
