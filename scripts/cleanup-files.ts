import "./load-env";

import { getPrisma } from "../lib/db";
import { removeStoredFile } from "../lib/self-hosted/storage";

async function main() {
  const db = getPrisma();
  const tasks = await db.fileCleanupTask.findMany({ orderBy: { createdAt: "asc" }, take: 500 });
  let removed = 0;
  for (const task of tasks) {
    try {
      await removeStoredFile(task.relativePath);
      await db.fileCleanupTask.delete({ where: { id: task.id } });
      removed += 1;
    } catch (error) {
      await db.fileCleanupTask.update({ where: { id: task.id }, data: { attempts: { increment: 1 }, lastError: error instanceof Error ? error.message : String(error) } });
    }
  }
  console.log(`附件清理任务完成：成功 ${removed}，待重试 ${tasks.length - removed}`);
  await db.$disconnect();
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
