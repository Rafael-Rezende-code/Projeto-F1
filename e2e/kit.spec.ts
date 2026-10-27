import { expect, test } from "./fixtures";

// Kit dia de corrida (loja extra, item 2): montar na página do piloto, sacola agrupada com a economia, remover uma peça
// tira o desconto, e o pedido sai com o desconto calculado no servidor. Modo seed: kits locais (lib/kits.ts).
test("kit: adicionar, agrupar na sacola, remover peça e finalizar com desconto", async ({ page }) => {
  await page.route("https://viacep.com.br/ws/**", (route) =>
    route.fulfill({ json: { cep: "01310-100", logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" } }),
  );
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/pilotos/hamilton");
  const kit = page.locator("section", { has: page.getByRole("heading", { name: "Kit dia de corrida Hamilton" }) });
  await kit.scrollIntoViewIfNeeded();
  await expect(kit.locator("[data-kit-price]")).toHaveText(/R\$\s?485,73/); // (239,90 + 199,90 + 99,90) − 10%

  // Sem tamanho da camiseta: aviso. Depois escolhe e adiciona.
  await kit.getByRole("button", { name: "Adicionar kit à sacola" }).click();
  await expect(kit.getByRole("alert")).toContainText("Escolha o tamanho de Camiseta Lewis Hamilton");
  await kit.getByLabel("Tamanho de Camiseta Lewis Hamilton").selectOption({ label: "M" });
  await kit.getByRole("button", { name: "Adicionar kit à sacola" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Kit dia de corrida Hamilton foi adicionado à sacola" })).toBeVisible();

  await page.goto("/carrinho");
  const group = page.locator("[data-kit-group]");
  await expect(group).toContainText("Kit dia de corrida Hamilton");
  await expect(group).toContainText(/Você economiza R\$\s?53,97/);
  await expect(page.getByText("Desconto de kit")).toBeVisible();

  // Remover o pôster tira o desconto; voltar com ele, o kit reaparece.
  await page.getByRole("button", { name: /Remover Pôster Lewis Hamilton/ }).click();
  await expect(group).toHaveCount(0);
  await expect(page.getByText("Desconto de kit")).toHaveCount(0);
  await page.goto("/pilotos/hamilton");
  await kit.getByLabel("Tamanho de Camiseta Lewis Hamilton").selectOption({ label: "M" });
  await kit.getByRole("button", { name: "Adicionar kit à sacola" }).click();
  await expect(page.getByRole("status").filter({ hasText: "foi adicionado à sacola" })).toBeVisible();

  // Checkout: o servidor aplica o desconto do kit no pedido.
  await page.goto("/checkout");
  await page.getByLabel("Nome completo").fill("Teste da Silva");
  await page.getByLabel("E-mail").fill("teste@exemplo.com");
  await page.getByLabel("Telefone").fill("11912345678");
  await page.getByLabel("CEP").fill("01310100");
  await expect(page.getByLabel("Rua")).toHaveValue("Avenida Paulista");
  await page.getByLabel("Número").fill("1000");
  await expect(page.locator("input[name=entrega]:checked")).toHaveCount(1);
  await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await expect(page).toHaveURL(/\/pedido\/APX-/);
  await expect(page.getByText("Kit dia de corrida Hamilton", { exact: true })).toBeVisible();
});
