import "./load-env";

import process from "node:process";

import { getPrisma } from "../lib/db";
import { notifyUser } from "../lib/feishu/notify";

async function main() {
  const operatorMode = process.argv[2] === "operator";
  const email = operatorMode ? process.env.OPERATOR_TEST_EMAIL : process.env.INVITE_TEST_EMAIL;
  const expectedRole = operatorMode ? "operator" : "developer";
  if (!email) throw new Error("Test account email is missing");

  const user = await getPrisma().user.findFirst({
    where: { loginName: email.trim().toLowerCase() },
    select: { id: true, role: true, feishuUserId: true },
  });
  if (!user) throw new Error("The configured test user does not exist");
  if (user.role !== expectedRole) throw new Error(`Expected ${expectedRole}, received ${user.role}`);
  if (!user.feishuUserId) throw new Error("The test user has no Feishu Open ID binding");

  const result = await notifyUser({
    recipientId: user.id,
    event: "production_test",
    title: "ORS production notification test",
    content: "This is a production integration test. No action is required.",
    link: process.env.NEXT_PUBLIC_APP_URL,
    color: "blue",
  });
  console.log(JSON.stringify({ role: user.role, delivered: result.status === "success", status: result.status, error: result.error ?? null }));
  if (result.status !== "success") process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Feishu notification test failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getPrisma().$disconnect();
    } catch {
      // The client may not have been created when configuration validation fails.
    }
  });
