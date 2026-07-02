import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/cloudflare/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
