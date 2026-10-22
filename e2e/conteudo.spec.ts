import { expect, test } from "@playwright/test";

// Conteúdo da rodada de conteúdo (fases 4 a 8): Diário (índice → artigo → produtos relacionados), textos do piloto e
// da equipe, e /sobre. Também confere que nada promete vínculo oficial.

test("Diário: do cabeçalho ao artigo, com produtos relacionados", async ({ page, isMobile }) => {
  await page.goto("/");
  // "Ler o Diário →" na seção "Luzes apagadas."
  await page.locator("#journal").getByRole("link", { name: /Ler o Diário/ }).click();
  await expect(page).toHaveURL(/\/diario$/);
  await expect(page.getByRole("heading", { level: 1, name: "Histórias de quem vive a corrida." })).toBeVisible();

  await page.getByRole("link", { name: "Senna e a McLaren: os anos em que o Brasil acordava cedo" }).click();
  await expect(page).toHaveURL(/\/diario\/senna-e-a-mclaren$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Senna e a McLaren");
  await expect(page.getByText(/min de leitura/).first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Interlagos, 1991: a vitória em sexta marcha" })).toBeVisible();
  await expect(page.getByRole("img", { name: /garrafa de champanhe/ })).toBeVisible();
  await expect(page.getByText("Texto editorial independente, escrito por fãs.")).toBeVisible();
  await page.getByRole("heading", { name: "Produtos relacionados" }).scrollIntoViewIfNeeded();
  await expect(page.locator("#relacionados").locator("xpath=ancestor::section").getByRole("article").first()).toBeVisible();
  // JSON-LD do artigo
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(jsonLd ?? "{}")["@type"]).toBe("Article");
  // "Diário" no cabeçalho (desktop) aponta para /diario
  if (!isMobile) await expect(page.getByRole("banner").getByRole("link", { name: "Diário" })).toHaveAttribute("href", "/diario");
});

test("piloto: texto editorial, números e destaques no topo", async ({ page }) => {
  await page.goto("/pilotos/hamilton");
  await expect(page.getByRole("heading", { level: 1, name: "Lewis Hamilton" })).toBeAttached();
  await expect(page.getByText("[TEXTO SOBRE O PILOTO]")).toHaveCount(0);
  await page.getByRole("heading", { name: "A história de Lewis" }).scrollIntoViewIfNeeded();
  await expect(page.getByText("Estreou na Fórmula 1 em 2007")).toBeVisible();
  const numbers = page.getByRole("region", { name: "Lewis Hamilton em números" });
  await expect(numbers.getByText("Títulos mundiais")).toBeVisible();
  await expect(numbers.getByText("44", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Curiosidades" })).toBeVisible();
  // Sem carro no projeto: miniaturas de produtos do piloto no topo (desktop) ou depois da foto (celular).
  await expect(page.getByText("Destaques Hamilton").first()).toBeAttached();
});

test("equipe: história, marcos e sede entre o cabeçalho e os produtos", async ({ page }) => {
  await page.goto("/equipes/williams");
  await expect(page.getByRole("heading", { name: "Sobre a Williams" })).toBeVisible();
  await expect(page.getByText("Frank Williams e Patrick Head fundaram a equipe em 1977.")).toBeVisible();
  await expect(page.getByText("Grove, Inglaterra")).toBeVisible();
  await expect(page.getByRole("list", { name: "Marcos da Williams" }).getByRole("listitem")).toHaveCount(3);
});

test("/sobre: manifesto, categorias e [CONFIRMAR] destacado; nada de loja oficial", async ({ page }) => {
  await page.goto("/sobre");
  await expect(page.getByRole("heading", { level: 1, name: "Feita para quem sente a corrida." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "O que vendemos" })).toBeVisible();
  await expect(page.getByText("Não somos uma loja oficial de nenhuma equipe ou piloto")).toBeVisible();
  expect(await page.locator("mark", { hasText: "[CONFIRMAR]" }).count()).toBeGreaterThan(3);
});
