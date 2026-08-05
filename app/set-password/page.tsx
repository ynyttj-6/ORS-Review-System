"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, ConfigProvider, Form, Input, Typography } from "antd";
import { LockOutlined, ProductOutlined } from "@ant-design/icons";
import zhCN from "antd/locale/zh_CN";
import { createClient } from "@/lib/supabase/client";

const { Title, Text } = Typography;

export default function SetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async ({ password }: { password: string }) => {
    setLoading(true); setError("");
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    router.replace("/dashboard"); router.refresh();
  };
  return <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: "#3b5ccc", borderRadius: 10 } }}><main className="login-page"><section className="login-story"><div className="login-brand"><span><ProductOutlined /></span>ORS 选品审核中心</div><div><Text>ACCOUNT ACTIVATION</Text><Title>完成最后一步，<br />开始高效协作。</Title><p>设置你的登录密码。审核数据与团队资料将受到角色权限保护。</p></div><div /></section><section className="login-panel"><Card className="login-card"><Title level={3}>设置登录密码</Title><Text type="secondary">密码至少 12 位，建议包含大小写字母、数字与符号</Text>{error && <Alert type="error" showIcon message="设置失败" description={error} />}<Form layout="vertical" onFinish={submit} requiredMark={false}><Form.Item label="新密码" name="password" rules={[{ required: true }, { min: 12, message: "密码至少 12 位" }]}><Input.Password size="large" prefix={<LockOutlined />} /></Form.Item><Form.Item label="确认密码" name="confirm" dependencies={["password"]} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue("password") === value ? Promise.resolve() : Promise.reject(new Error("两次输入的密码不一致")); } })]}><Input.Password size="large" prefix={<LockOutlined />} /></Form.Item><Button type="primary" size="large" htmlType="submit" loading={loading} block>保存密码并进入系统</Button></Form></Card></section></main></ConfigProvider>;
}
