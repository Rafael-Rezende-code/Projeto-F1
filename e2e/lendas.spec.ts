import { expect, test } from "./fixtures";

// Hub "Lendas" (loja extra, item 7): índice com os 8 nomes, página com nome grande, produtos (ou "Em breve"),
// história, números, curiosidades, "Leia também" e JSON-LD; bloco na home e link no rodapé.
test("lendas: hub, página da lenda e bloco da home", async ({ page }) => {
  await page.goto("/lendas");
  await expect(page.getByRole("heading", { level: 1, name: "Lendas" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /Senna|Fittipaldi|Piquet|Schumacher|Prost|Lauda|Fangio|Clark/ })).toHaveCount(8);

  await page.getByRole("main").getByRole("link", { name: /Fangio/ }).click();
  await expect(page).toHaveURL(/\/lendas\/fangio$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Fangio");
  // Seed sem produtos com a tag lenda-fangio: "Em breve" com newsletter e Diário.
  const soon = page.locator("[data-em-breve]");
  await expect(soon).toBeVisible();
  await expect(soon.getByRole("link", { name: "Avise-me pela newsletter" })).toHaveAttribute("href", "/#newsletter");
  await expect(soon.getByRole("link", { name: "Ler o Diário" })).toHaveAttribute("href", "/diario");
  await expect(page.getByRole("heading", { name: "A história de Fangio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Curiosidades" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Leia também" })).toBeVisible();
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.some((text) => text.includes('"@type":"Person"') && text.includes("Juan Manuel Fangio"))).toBe(true);

  // Senna: a foto do projeto e o artigo do Diário em "Leia também".
  await page.goto("/lendas/senna");
  await expect(page.getByRole("link", { name: /Senna e a McLaren|McLaren/ }).first()).toBeVisible();

  await page.goto("/");
  await expect(page.locator("#lendas").getByRole("link", { name: /Senna|Fittipaldi|Piquet|Schumacher/ })).toHaveCount(4);
  await expect(page.locator("footer").locator('a[href="/lendas"]')).toHaveCount(1);
});
