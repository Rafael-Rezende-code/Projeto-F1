import { expect, test } from "./fixtures";

// Drops e pré-venda (loja extra, item 6). Os drops de exemplo só existem em DESENVOLVIMENTO (sem banco, a loja não
// inventa lançamentos). Rode contra o dev server sem Supabase:
// E2E_DROPS=1 E2E_BASE_URL=http://localhost:3002 npx playwright test e2e/drop.spec.ts
test.skip(!process.env.E2E_DROPS, "precisa do dev server com os drops de exemplo (E2E_DROPS=1)");

test("drop: Em breve não compra; pré-venda com previsão e limite por pedido", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator("[data-drops-home]")).toBeVisible();
  if (!isMobile) await expect(page.locator("header").first().getByRole("link", { name: "Drops", exact: true })).toBeVisible();

  await page.goto("/drops/exemplo-em-breve");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Drop de exemplo");
  await expect(page.getByLabel("Tempo até o lançamento").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Em breve" }).filter({ visible: true }).first()).toBeDisabled(); // lista de espera sem banco

  // Antes do lançamento: a peça não pode ir para a sacola.
  await page.goto("/produtos/bone-hamilton");
  await expect(page.locator("[data-drop-status]")).toContainText("Em breve");
  await expect(page.getByRole("button", { name: "Em breve", exact: true })).toBeDisabled();

  // Pré-venda lançada: selo, previsão de envio e limite de 2 por pedido.
  await page.goto("/produtos/poster-hamilton");
  const status = page.locator("[data-drop-status]");
  await expect(status).toContainText("Pré-venda");
  await expect(status).toContainText("Envio previsto: a partir de 20/12");
  await expect(status).toContainText("Limite de 2 peças deste drop por pedido.");
  const add = page.getByRole("button", { name: "Adicionar à sacola", exact: true });
  await add.click();
  await add.click();
  await add.click();
  await expect(page.getByRole("status").filter({ hasText: "Limite de 2 por pedido" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("apex:sacola:v1") ?? "[]")[0]?.quantity)).toBe(2);
});
