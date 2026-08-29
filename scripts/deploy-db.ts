import "./load-env";

import { open, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { selfHostedPaths, sqliteUrl } from "../lib/self-hosted/paths";

async function main() {
  const paths = selfHostedPaths();
  await mkdir(paths.dataDir, { recursive: true });
  const handle = await open(paths.databasePath, "a");
  await handle.close();
  const mode = process.argv[2] === "dev" ? "dev" : "deploy";
  const extraArgs = mode === "dev" ? process.argv.slice(3) : [];
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  const result = spawnSync(process.execPath, [prismaCli, "migrate", mode, ...extraArgs], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: sqliteUrl(paths.databasePath) },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
