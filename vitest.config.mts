import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes unitários da lógica pura (sacola, formatação, validações). Sem DOM.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { include: ["lib/**/*.test.ts"], environment: "node" },
});
