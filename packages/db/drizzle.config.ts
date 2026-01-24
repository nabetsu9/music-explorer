import { defineConfig } from "drizzle-kit";

const isLocal = !process.env.TURSO_DATABASE_URL;

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle/migrations",
  dialect: isLocal ? "sqlite" : "turso",
  dbCredentials: isLocal
    ? { url: "file:./local.db" }
    : {
        url: process.env.TURSO_DATABASE_URL ?? "",
        authToken: process.env.TURSO_AUTH_TOKEN,
      },
});
