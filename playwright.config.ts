import { defineConfig, devices } from "@playwright/test";

// E2E do fluxo de compra. Usa o Microsoft Edge instalado na máquina (channel "msedge"), sem baixar navegadores do
// Playwright. Em CI/Linux, trocar por `npx playwright install chromium` e remover o channel.
// Sobe o dev server se não houver um rodando em http://localhost:3000.
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", locale: "pt-BR", colorScheme: "light" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], channel: "msedge" } },
    { name: "celular", use: { ...devices["Pixel 7"], channel: "msedge" } },
  ],
  webServer: { command: "corepack pnpm dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 180_000 },
});
