import path from "node:path";

function resolveConfiguredPath(value: string | undefined, fallback: string) {
  return path.resolve(value?.trim() || fallback);
}

export function selfHostedPaths() {
  const dataDir = resolveConfiguredPath(process.env.ORS_DATA_DIR, path.join(process.cwd(), "data"));
  const backupDir = resolveConfiguredPath(process.env.ORS_BACKUP_DIR, path.join(process.cwd(), "backups"));
  return {
    dataDir,
    databasePath: path.join(dataDir, "ors.db"),
    uploadsDir: path.join(dataDir, "uploads"),
    tempDir: path.join(dataDir, "tmp"),
    backupDir,
  };
}

export function sqliteUrl(databasePath = selfHostedPaths().databasePath) {
  return `file:${databasePath.replaceAll("\\", "/")}`;
}
