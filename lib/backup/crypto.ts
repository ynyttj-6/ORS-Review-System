import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export function backupKey() {
  const encoded = process.env.ORS_BACKUP_ENCRYPTION_KEY;
  if (!encoded) throw new Error("缺少 ORS_BACKUP_ENCRYPTION_KEY（32 字节 Base64 密钥）");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("ORS_BACKUP_ENCRYPTION_KEY 解码后必须正好为 32 字节");
  return key;
}

export function encryptBackup(data: Buffer, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

export function decryptBackup(data: Buffer, key: Buffer) {
  if (data.length < 29) throw new Error("加密备份文件格式无效");
  const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
}

export function checksum(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}
