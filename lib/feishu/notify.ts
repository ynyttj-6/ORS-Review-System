import { getPrisma } from "@/lib/db";
import { productionEnv } from "@/lib/env";

type NoticeColor = "blue" | "green" | "red" | "orange";

export interface NotifyParams {
  recipientId: string;
  event: string;
  title: string;
  content: string;
  link?: string;
  color?: NoticeColor;
}

export async function notifyUser(params: NotifyParams) {
  const db = getPrisma();
  const recipient = await db.user.findUnique({ where: { id: params.recipientId } });
  let status = "skipped";
  let errorMessage: string | undefined;

  try {
    const env = productionEnv();
    if (!recipient?.feishuUserId || !env.FEISHU_APP_ID || !env.FEISHU_APP_SECRET) {
      errorMessage = "未配置飞书凭据或接收人未绑定飞书 User ID";
    } else {
      const tokenResponse = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET }),
        cache: "no-store",
      });
      const tokenData = await tokenResponse.json() as { code: number; msg?: string; tenant_access_token?: string };
      if (!tokenResponse.ok || tokenData.code !== 0 || !tokenData.tenant_access_token) throw new Error(tokenData.msg || "获取飞书访问令牌失败");

      const card = {
        schema: "2.0",
        config: { wide_screen_mode: true },
        header: { title: { tag: "plain_text", content: params.title }, template: params.color || "blue" },
        body: { elements: [
          { tag: "markdown", content: params.content },
          ...(params.link ? [{ tag: "button", text: { tag: "plain_text", content: "查看选品" }, url: params.link, type: "primary" }] : []),
        ] },
      };
      const sendResponse = await fetch("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenData.tenant_access_token}`, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ receive_id: recipient.feishuUserId, msg_type: "interactive", content: JSON.stringify(card) }),
        cache: "no-store",
      });
      const sendData = await sendResponse.json() as { code: number; msg?: string };
      if (!sendResponse.ok || sendData.code !== 0) throw new Error(sendData.msg || "飞书消息发送失败");
      status = "success";
    }
  } catch (error) {
    status = "failed";
    errorMessage = error instanceof Error ? error.message : "未知错误";
  }

  await db.notificationLog.create({ data: { recipientId: recipient?.id, event: params.event, content: params.content, status, error: errorMessage } });
  return { status, error: errorMessage };
}
