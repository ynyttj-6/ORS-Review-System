"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, ConfigProvider, Form, Input, Spin, Typography } from "antd";
import { SafetyCertificateOutlined } from "@ant-design/icons";
import zhCN from "antd/locale/zh_CN";
import { createClient } from "@/lib/supabase/client";

const { Title, Text, Paragraph } = Typography;

export default function MfaPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.replace("/login"); return; }
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.data?.currentLevel === "aal2") { router.replace("/dashboard"); return; }
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      const verified = factors.data?.totp[0];
      if (verified) {
        if (active) setFactorId(verified.id);
        return;
      }
      const stale = factors.data?.all.find((factor) => factor.factor_type === "totp" && factor.status === "unverified");
      if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });
      const enrollment = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "ORS 管理员", issuer: "ORS" });
      if (enrollment.error || !enrollment.data || enrollment.data.type !== "totp") throw enrollment.error || new Error("无法创建双重验证因子");
      if (active) {
        setFactorId(enrollment.data.id);
        setQrCode(`data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.data.totp.qr_code)}`);
        setSecret(enrollment.data.totp.secret);
      }
    };
    initialize().catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "双重验证初始化失败"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  const verify = async ({ code }: { code: string }) => {
    setVerifying(true); setError("");
    try {
      const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
      if (verifyError) throw verifyError;
      router.replace("/dashboard"); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "验证码无效"); }
    finally { setVerifying(false); }
  };

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: "#3b5ccc", borderRadius: 10 } }}>
      <main className="login-page">
        <section className="login-story"><div className="login-brand"><span><SafetyCertificateOutlined /></span>ORS 安全验证</div><div><Title>管理员双重验证</Title><p>密码之外，再使用身份验证器生成的一次性验证码保护管理权限。</p></div></section>
        <section className="login-panel"><Card className="login-card">
          <Title level={3}>验证管理员身份</Title>
          {loading ? <Spin description="正在准备验证…" /> : <>
            {error && <Alert type="error" showIcon title="验证失败" description={error} />}
            {qrCode ? <><Paragraph>使用 Microsoft Authenticator、Google Authenticator 或其他 TOTP 应用扫描二维码。</Paragraph><img src={qrCode} alt="管理员 MFA 二维码" style={{ display: "block", width: 220, height: 220, margin: "16px auto" }} /><Text type="secondary">无法扫码时手动输入密钥：</Text><Input.Password value={secret} readOnly visibilityToggle style={{ margin: "8px 0 20px" }} /></> : <Alert type="info" showIcon title="请输入身份验证器验证码" description="该管理员账号已经绑定验证器。" />}
            <Form layout="vertical" onFinish={verify} requiredMark={false} style={{ marginTop: 18 }}>
              <Form.Item label="6 位验证码" name="code" rules={[{ required: true, message: "请输入验证码" }, { pattern: /^\d{6}$/, message: "验证码应为 6 位数字" }]}><Input size="large" inputMode="numeric" autoComplete="one-time-code" maxLength={6} /></Form.Item>
              <Button type="primary" size="large" htmlType="submit" loading={verifying} disabled={!factorId} block>完成验证</Button>
            </Form>
          </>}
        </Card></section>
      </main>
    </ConfigProvider>
  );
}
