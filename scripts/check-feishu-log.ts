import "./load-env";

import { getPrisma } from "../lib/db";
import { CHINA_TIME_ZONE, formatChinaDateTime } from "../lib/time";

async function main() {
  const logs = await getPrisma().notificationLog.findMany({
    where: { event: "production_test" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      status: true,
      error: true,
      createdAt: true,
      recipient: { select: { role: true } },
    },
  });

  const latestByRole = new Map<string, (typeof logs)[number]>();
  for (const log of logs) {
    const role = log.recipient?.role ?? "unknown";
    if (!latestByRole.has(role)) latestByRole.set(role, log);
  }

  console.log(JSON.stringify({
    timeZone: CHINA_TIME_ZONE,
    productionTestLogCount: logs.length,
    latestByRole: [...latestByRole.entries()].map(([role, log]) => ({
      role,
      status: log.status,
      hasError: Boolean(log.error),
      createdAt: formatChinaDateTime(log.createdAt),
    })),
  }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Feishu notification log check failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getPrisma().$disconnect();
    } catch {
      // The client may not have been created when configuration validation fails.
    }
  });
