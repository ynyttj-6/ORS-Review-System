"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, ConfigProvider, Form, Input, Space, Typography } from "antd";
import { LockOutlined, ProductOutlined, UserOutlined } from "@ant-design/icons";
import zhCN from "antd/locale/zh_CN";

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const production = process.env.NEXT_PUBLIC_APP_MODE === "production";

  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get("error");
    if (message) setError(message);
  }, []);

  const submit = async ({ account, password }: { account: string; password: string }) => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account, password }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "登录失败，请检查账号和密码");
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败，请检查账号和密码");
    } finally { setLoading(false); }
  };

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: "#3b5ccc", borderRadius: 10 } }}>
      <main className="login-page">
        <section className="login-story">
          <div className="login-brand"><span><ProductOutlined /></span>ORS 选品审核中心</div>
          <div><Text>PRODUCT REVIEW OPERATIONS</Text><Title>让每一个好产品，<br />更快走向市场。</Title><p>从提交、分配、审核到多轮复审，团队协作清晰可追溯。</p></div>
          <Space size="large"><span>角色权限隔离</span><span>审核全程留痕</span><span>飞书实时通知</span></Space>
        </section>
        <section className="login-panel">
          <Card className="login-card">
            <Title level={3}>登录工作台</Title><Text type="secondary">使用管理员发放的账号和密码</Text>
            {!production && <Alert type="info" showIcon title="当前是演示模式" description="将 NEXT_PUBLIC_APP_MODE 设置为 production 后启用 Supabase 登录。" />}
            {error && <Alert type="error" showIcon title="登录失败" description={error} />}
            <Form layout="vertical" onFinish={submit} requiredMark={false}>
              <Form.Item label="登录账号" name="account" rules={[{ required: true, message: "请输入登录账号" }]}><Input size="large" prefix={<UserOutlined />} autoComplete="username" placeholder="输入管理员发放的账号" /></Form.Item>
              <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}><Input.Password size="large" prefix={<LockOutlined />} placeholder="输入登录密码" /></Form.Item>
              <Button type="primary" size="large" htmlType="submit" loading={loading} disabled={!production} block>登录</Button>
              {!production && <Button size="large" block onClick={() => router.push("/dashboard")}>进入演示系统</Button>}
            </Form>
          </Card>
        </section>
      </main>
    </ConfigProvider>
  );
}
