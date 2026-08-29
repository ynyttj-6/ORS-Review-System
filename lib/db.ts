import { mkdirSync } from "node:fs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { selfHostedPaths, sqliteUrl } from "@/lib/self-hosted/paths";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const paths = selfHostedPaths();
  mkdirSync(paths.dataDir, { recursive: true });
  const factory = new PrismaBetterSqlite3({ url: sqliteUrl(paths.databasePath), timeout: 5000 });
  const connect = factory.connect.bind(factory);
  factory.connect = async () => {
    const connection = await connect();
    await connection.executeScript([
      "PRAGMA journal_mode=WAL",
      "PRAGMA foreign_keys=ON",
      "PRAGMA busy_timeout=5000",
      "PRAGMA synchronous=NORMAL",
    ].join("; "));
    return connection;
  };
  return new PrismaClient({ adapter: factory });
}

export function getPrisma() {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}
