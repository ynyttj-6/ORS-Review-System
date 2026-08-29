import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { sqliteUrl } from "./lib/self-hosted/paths";

config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL || sqliteUrl(),
  },
});
