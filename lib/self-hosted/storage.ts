import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { selfHostedPaths } from "@/lib/self-hosted/paths";

const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) => bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value),
  "application/pdf": (bytes) => bytes.length >= 5 && Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-",
};

const extensions: Record<string, Set<string>> = {
  "image/jpeg": new Set([".jpg", ".jpeg"]),
  "image/png": new Set([".png"]),
  "application/pdf": new Set([".pdf"]),
};

export function validateFileContent(fileName: string, mimeType: string, bytes: Uint8Array) {
  const extension = path.extname(fileName).toLowerCase();
  return Boolean(signatures[mimeType]?.(bytes) && extensions[mimeType]?.has(extension));
}

function safeFileName(fileName: string) {
  return path.basename(fileName).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(-120) || "attachment";
}

export function resolveStoredFile(relativePath: string) {
  const uploadsRoot = path.resolve(selfHostedPaths().uploadsDir);
  const resolved = path.resolve(uploadsRoot, relativePath);
  if (resolved !== uploadsRoot && !resolved.startsWith(`${uploadsRoot}${path.sep}`)) throw new Error("附件路径越界");
  return resolved;
}

export async function storeFile(productId: string, fileName: string, bytes: Uint8Array) {
  const paths = selfHostedPaths();
  const relativePath = path.posix.join(productId, `${randomUUID()}-${safeFileName(fileName)}`);
  const destination = resolveStoredFile(relativePath);
  const temporary = path.join(paths.tempDir, `${randomUUID()}.uploading`);
  await Promise.all([mkdir(path.dirname(destination), { recursive: true }), mkdir(paths.tempDir, { recursive: true })]);
  try {
    await writeFile(temporary, bytes, { flag: "wx" });
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
  return { relativePath, sha256: createHash("sha256").update(bytes).digest("hex") };
}

export async function removeStoredFile(relativePath: string) {
  await rm(resolveStoredFile(relativePath), { force: true });
}
