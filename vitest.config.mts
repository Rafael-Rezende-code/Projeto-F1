import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes unitários da lógica pura (sacola, formatação, validações, webhook) e do banco (PGlite). Sem DOM.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  // supabase/tests: migração + seed num Postgres em memória (PGlite).
  test: { include: ["lib/**/*.test.ts", "app/**/*.test.ts", "scripts/**/*.test.ts", "supabase/tests/**/*.test.ts"], environment: "node" },
});
