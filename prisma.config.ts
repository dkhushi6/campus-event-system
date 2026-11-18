import fs from "node:fs";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 does not read .env automatically the way Next.js does, so load it here.
const envFile = path.join(process.cwd(), ".env");
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

// Prisma 7 configuration. The connection URL lives here (not in schema.prisma)
// and is read from .env — see .env.example.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
