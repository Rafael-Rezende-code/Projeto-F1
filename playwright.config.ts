import { defineConfig, devices } from "@playwright/test";

// E2E do fluxo de compra. Usa o Microsoft Edge instalado na máquina (channel "msedge"), sem baixar navegadores do
// Playwright. Em CI/Linux, trocar por `npx playwright install chromium` e remover o channel.
// Sobe o dev server se não houver um rodando em http://localhost:3000. Para testar o build de produção:
// E2E_BASE_URL=http://localhost:3001 corepack pnpm test:e2e (com `next start -p 3001` rodando).
// Sem Edge (ex.: sessão em nuvem Linux): PW_EXECUTABLE_PATH=/caminho/do/chromium usa esse navegador no lugar do Edge.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const browser = process.env.PW_EXECUTABLE_PATH ? { launchOptions: { executablePath: process.env.PW_EXECUTABLE_PATH } } : { channel: "msedge" };
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // Um arquivo por vez: com vários navegadores ao mesmo tempo o servidor local (next start) fica lento e cliques expiram.
  workers: 1,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure", locale: "pt-BR", colorScheme: "light" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], ...browser } },
    { name: "celular", use: { ...devices["Pixel 7"], ...browser } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "corepack pnpm dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 180_000 },
});
