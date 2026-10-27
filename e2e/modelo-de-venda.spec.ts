import { expect, test } from "./fixtures";

// Modelo de venda (refino 2, item 5): aviso de sob encomenda na página de produto, prazo do item mais lento na sacola
// com aviso de pacotes separados, e nenhum dado privado (custo, fornecedor, notas) nas respostas públicas.
const SECRETS = /cost_?cents|costCents|supplier_?url|supplierUrl|supplier_shipping|supplierShipping|product_private/i;

test("sob encomenda: aviso no produto e prazo do item mais lento na sacola", async ({ page }) => {
  await page.goto("/produtos/miniatura-capacete-hamilton");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // Escopo no conteúdo principal: durante o streaming o React mantém por um instante uma cópia oculta do trecho.
  const main = page.locator("#conteudo");
  await expect(main.getByText("Produto sob encomenda · Importado")).toBeVisible();
  await expect(main.getByText("Envio estimado em 15 a 30 dias úteis.")).toBeVisible();
  const sizes = page.locator("label[data-sku]:not([data-out])");
  if (await sizes.count()) await sizes.first().click();
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "foi adicionado à sacola" })).toBeVisible();

  // Peça de estoque próprio: sem aviso.
  await page.goto("/produtos/camiseta-hamilton");
  await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(main.getByText(/Produto sob encomenda/)).toHaveCount(0);
  await page.locator("label[data-sku]:not([data-out])").first().click();
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "foi adicionado à sacola" })).toBeVisible();

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

test("frete: entrega local em São Sebastião do Paraíso e prazo total (envio + transporte)", async ({ page }) => {
  // A entrega local só existe com LOCAL_DELIVERY_* configuradas NO SERVIDOR (lib/shipping/config.ts). Para rodar este teste,
  // suba o site com LOCAL_DELIVERY_ENABLED=true, LOCAL_DELIVERY_PRICE_CENTS=1000, LOCAL_DELIVERY_DAYS_MIN=1 e
  // LOCAL_DELIVERY_DAYS_MAX=2 e rode o e2e com LOCAL_DELIVERY_ENABLED=true também no ambiente do teste.
  test.skip(process.env.LOCAL_DELIVERY_ENABLED !== "true", "entrega local não configurada (opcional)");
  await page.route("https://viacep.com.br/ws/**", (route) =>
    route.fulfill({ json: { cep: "37950-000", logradouro: "Praça Comendador João Alves", bairro: "Centro", localidade: "São Sebastião do Paraíso", uf: "MG" } }),
  );
  await page.goto("/produtos/camiseta-hamilton");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("label[data-sku]:not([data-out])").first().click();
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "foi adicionado à sacola" })).toBeVisible();
  await page.goto("/checkout");
  await page.getByLabel("Nome completo").fill("Teste da Silva");
  await page.getByLabel("E-mail").fill("teste@exemplo.com");
  await page.getByLabel("Telefone").fill("35912345678");
  await page.getByLabel("CEP").fill("37950000");
  await expect(page.getByLabel("Rua")).toHaveValue("Praça Comendador João Alves");
  await page.getByLabel("Número").fill("10");
  const local = page.locator("label", { hasText: "Entrega local" });
  await expect(local).toBeVisible();
  // camiseta: envio em 1 a 2 dias úteis + entrega local 1 a 2 → chega em 2 a 4
  await expect(local).toContainText("Chega em 2 a 4 dias úteis");
  await expect(page.locator("label", { hasText: "Econômica" })).toBeVisible();
});

test("calcular frete na página de produto; o checkout reaproveita o CEP", async ({ page }) => {
  await page.route("https://viacep.com.br/ws/**", (route) =>
    route.fulfill({ json: route.request().url().includes("99999999") ? { erro: true } : { cep: "37950-000", logradouro: "Praça Comendador João Alves", bairro: "Centro", localidade: "São Sebastião do Paraíso", uf: "MG" } }),
  );
  await page.goto("/produtos/camiseta-hamilton");
  await page.evaluate(() => localStorage.clear());
  const field = page.getByLabel("Calcular frete");
  await field.fill("123");
  await page.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByText("Digite um CEP com 8 números.")).toBeVisible();
  await field.fill("99999999");
  await page.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByText("CEP não encontrado. Confira os números.")).toBeVisible();
  await field.fill("37950000");
  await page.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByText("Para São Sebastião do Paraíso/MG")).toBeVisible();
  await expect(page.getByText(/Chega em/).first()).toBeVisible();

  // Checkout: o CEP calculado entra sozinho na seção Entrega.
  await page.locator("label[data-sku]:not([data-out])").first().click();
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
  await page.goto("/checkout");
  await page.getByLabel("Nome completo").fill("Teste da Silva");
  await page.getByLabel("E-mail").fill("teste@exemplo.com");
  await page.getByLabel("Telefone").fill("35912345678");
  await expect(page.getByLabel("CEP")).toHaveValue("37950-000");
  await expect(page.getByLabel("Rua")).toHaveValue("Praça Comendador João Alves");
});
