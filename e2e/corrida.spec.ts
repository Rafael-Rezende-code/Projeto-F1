import { expect, test } from "./fixtures";

// Próxima corrida (loja extra, item 5). O calendário de exemplo só existe em DESENVOLVIMENTO (a loja não inventa
// calendário; no build de produção sem banco o bloco não aparece). Rode contra o dev server sem Supabase:
// E2E_CALENDAR=1 E2E_BASE_URL=http://localhost:3002 npx playwright test e2e/corrida.spec.ts
test.skip(!process.env.E2E_CALENDAR, "precisa do dev server com o calendário de exemplo (E2E_CALENDAR=1)");

test("próxima corrida: contador, fuso do visitante ou Brasília, coleção do fim de semana", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("apex:fuso:v1"));
  await page.reload();
  const block = page.locator("[data-next-race]");
  await expect(block).toBeVisible();
  await expect(block.getByRole("heading", { level: 2 })).toContainText("GP de Exemplo");
  // Números de verdade depois da hidratação (no HTML do servidor, "--" nas mesmas caixas).
  await expect(block.getByRole("definition").first()).toHaveText(/^\d{2}$/);
  await expect(block).toContainText("(seu horário)");
  await block.getByRole("button", { name: "Brasília" }).click();
  await expect(block.getByRole("button", { name: "Brasília" })).toHaveAttribute("aria-pressed", "true");
  await expect(block).toContainText("(Brasília)");
  expect(await page.evaluate(() => localStorage.getItem("apex:fuso:v1"))).toBe("brasilia");
  await expect(block.getByRole("link", { name: /Ver a coleção do fim de semana/ })).toHaveAttribute("href", "/produtos?tag=camiseta");

  // Também nas páginas de piloto e equipe.
  await page.goto("/pilotos/hamilton");
  await expect(page.locator("[data-next-race]")).toBeVisible();
  await page.goto("/equipes/ferrari");
  await expect(page.locator("[data-next-race]")).toBeVisible();
});
