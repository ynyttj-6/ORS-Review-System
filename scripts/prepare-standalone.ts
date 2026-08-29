import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";

async function main() {
  const root = process.cwd();
  const standalone = path.join(root, ".next", "standalone");
  if (!(await stat(standalone).catch(() => null))?.isDirectory()) throw new Error("Next.js standalone 输出不存在");
  await mkdir(path.join(standalone, ".next"), { recursive: true });
  await cp(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true, force: true });
  const publicDir = path.join(root, "public");
  if ((await stat(publicDir).catch(() => null))?.isDirectory()) await cp(publicDir, path.join(standalone, "public"), { recursive: true, force: true });
  console.log("standalone 静态资源已就绪");
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
