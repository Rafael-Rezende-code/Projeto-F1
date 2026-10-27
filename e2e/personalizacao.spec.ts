import { expect, test } from "./fixtures";

// Camisa personalizada (loja extra, item 3): prévia ao vivo, validação (palavra bloqueada, faixa), item próprio na
// sacola (produto + tamanho + personalização), adicional no total e nome/número na confirmação.
test("personalização: prévia, validação, sacola e pedido", async ({ page }) => {
  await page.route("https://viacep.com.br/ws/**", (route) =>
    route.fulfill({ json: { cep: "01310-100", logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" } }),
  );
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/produtos/camiseta-ferrari-2026");
  await page.locator("label[data-sku]:not([data-out])").first().click();

  await page.getByRole("checkbox", { name: /Personalizar com nome e número/ }).check();
  const name = page.getByLabel(/^Nome \(até 12\)/);
  const number = page.getByLabel("Número", { exact: true });
  await name.fill("joão");
  await expect(name).toHaveValue("JOAO");
  // O campo só aceita os dígitos da faixa (0 a 99); a faixa é conferida de novo no servidor e no banco.
  await number.fill("100");
  await expect(number).toHaveValue("10");
  await name.fill("porra");
  await number.fill("44");
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
  await expect(page.getByText("Esse nome não pode ser estampado. Escolha outro.")).toBeVisible();

  await name.fill("Lewis");
  await expect(page.locator("figure svg textPath")).toHaveText("LEWIS");
  await expect(page.locator("figure svg text").last()).toHaveText("44");
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "foi adicionado à sacola" })).toBeVisible();
  // A mesma camisa e tamanho sem personalização é outro item.
  await page.getByRole("checkbox", { name: /Personalizar com nome e número/ }).uncheck();
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();

  await page.goto("/carrinho");
  await expect(page.locator("[data-personalization]")).toHaveCount(1);
  await expect(page.locator("[data-personalization]")).toContainText("Nome: LEWIS · Nº 44");
  await expect(page.locator("[data-personalization]")).toContainText(/\+R\$\s?30,00 cada/);
  await expect(page.getByRole("button", { name: /^Remover Camiseta Ferrari 2026/ })).toHaveCount(2);

  await page.goto("/checkout");
  await page.getByLabel("Nome completo").fill("Teste da Silva");
  await page.getByLabel("E-mail").fill("teste@exemplo.com");
  await page.getByLabel("Telefone").fill("11912345678");
  await page.getByLabel("CEP").fill("01310100");
  await expect(page.getByLabel("Rua")).toHaveValue("Avenida Paulista");
  await page.getByLabel("Número", { exact: true }).fill("1000");
  await expect(page.locator("input[name=entrega]:checked")).toHaveCount(1);
  await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await expect(page).toHaveURL(/\/pedido\/APX-/);
  await expect(page.locator("[data-personalization]")).toContainText("Nome: LEWIS · Nº 44");
  // Subtotal do pedido montado no servidor: 2 camisas + R$ 30,00 de personalização.
  const order = await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find((item) => item.startsWith("apex:pedido:"));
    return key ? JSON.parse(sessionStorage.getItem(key) ?? "{}") : null;
  });
  expect(order.subtotalCents).toBe(order.lines[0].unitPriceCents * 2 + 3000);
});
