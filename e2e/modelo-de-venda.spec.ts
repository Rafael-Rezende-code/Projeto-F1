import { expect, test } from "@playwright/test";

// Modelo de venda (refino 2, item 5): aviso de sob encomenda na página de produto, prazo do item mais lento na sacola
// com aviso de pacotes separados, e nenhum dado privado (custo, fornecedor, notas) nas respostas públicas.
const SECRETS = /cost_?cents|costCents|supplier_?url|supplierUrl|supplier_shipping|supplierShipping|product_private/i;

test("sob encomenda: aviso no produto e prazo do item mais lento na sacola", async ({ page }) => {
  await page.goto("/produtos/miniatura-capacete-hamilton");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText("Produto sob encomenda · Importado")).toBeVisible();
  await expect(page.getByText("Envio estimado em 15 a 30 dias úteis.")).toBeVisible();
  const sizes = page.locator("label:has(input[name=tamanho]:not([disabled]))");
  if (await sizes.count()) await sizes.first().click();
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("foi adicionado à sacola");

  // Peça de estoque próprio: sem aviso.
  await page.goto("/produtos/camiseta-hamilton");
  await expect(page.getByText(/Produto sob encomenda/)).toHaveCount(0);
  await page.locator("label:has(input[name=tamanho]:not([disabled]))").first().click();
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("foi adicionado à sacola");

  await page.goto("/carrinho");
  await expect(page.getByText("Sob encomenda · envio em 15 a 30 dias úteis")).toBeVisible();
  await expect(page.getByText(/Envio estimado em\s*15 a 30 dias úteis/)).toBeVisible();
  await expect(page.getByText("o pedido pode chegar em mais de um pacote", { exact: false })).toBeVisible();
});

test("dados privados nunca aparecem nas páginas públicas", async ({ request }) => {
  for (const path of ["/produtos/miniatura-capacete-hamilton", "/produtos", "/pilotos/hamilton", "/"]) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toMatch(SECRETS);
  }
});
