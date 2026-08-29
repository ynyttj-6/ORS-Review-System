import { readdir, stat, statfs } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/api/auth";
import { getPrisma } from "@/lib/db";
import { handleApiError, ok } from "@/lib/api/response";
import { selfHostedPaths } from "@/lib/self-hosted/paths";

async function directorySize(root: string) {
  let total = 0;
  const pending = [root];
  while (pending.length) {
    const current = pending.pop()!;
    const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.isFile()) total += (await stat(fullPath)).size;
    }
  }
  return total;
}

export async function GET() {
  try {
    await requireUser(["admin"]);
    const paths = selfHostedPaths();
    await getPrisma().$queryRaw`SELECT 1`;
    const [database, uploadsBytes, disk, backups] = await Promise.all([
      stat(paths.databasePath).catch(() => null),
      directorySize(paths.uploadsDir),
      statfs(paths.dataDir),
      readdir(paths.backupDir, { withFileTypes: true }).catch(() => []),
    ]);
    const backupTimes = await Promise.all(backups.map((entry) => stat(path.join(paths.backupDir, entry.name)).then((item) => item.mtime).catch(() => null)));
    const lastBackupAt = backupTimes.filter((value): value is Date => Boolean(value)).sort((a, b) => b.getTime() - a.getTime())[0];
    return ok({
      database: "connected",
      databaseBytes: database?.size || 0,
      uploadsBytes,
      freeDiskBytes: Number(disk.bavail * disk.bsize),
      lastBackupAt: lastBackupAt?.toISOString() || null,
      singleInstance: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
