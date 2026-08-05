import "./load-env";

import process from "node:process";

import { getPrisma } from "../lib/db";

async function main() {
  const operatorMode = process.argv[2] === "operator";
  const email = operatorMode ? process.env.OPERATOR_TEST_EMAIL : process.env.INVITE_TEST_EMAIL;
  const openId = operatorMode
    ? process.env.OPERATOR_TEST_FEISHU_OPEN_ID
    : process.env.INVITE_TEST_FEISHU_OPEN_ID;
  const expectedRole = operatorMode ? "operator" : "developer";

  if (!email || !openId) throw new Error("Test account email or Feishu Open ID is missing");
  if (!openId.startsWith("ou_")) throw new Error("Feishu Open ID must start with ou_");

  const user = await getPrisma().user.findFirst({
    where: { OR: [{ loginName: email.trim().toLowerCase() }, { authEmail: email.trim().toLowerCase() }] },
    select: { id: true, role: true },
  });
  if (!user) throw new Error("The configured test user does not exist");
  if (user.role !== expectedRole) throw new Error(`Expected ${expectedRole}, received ${user.role}`);

  await getPrisma().user.update({
    where: { id: user.id },
    data: { feishuUserId: openId },
  });

  console.log(JSON.stringify({ bound: true, role: user.role, openIdStored: true }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Feishu recipient binding failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getPrisma().$disconnect();
    } catch {
      // The client may not have been created when configuration validation fails.
    }
  });
