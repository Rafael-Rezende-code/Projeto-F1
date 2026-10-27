import { expect, test } from "./fixtures";

// Checkout em uma página (loja extra, item 1): seções recolhíveis, ViaCEP, envio cotado sozinho, Pix primeiro (e com o
// desconto, quando NEXT_PUBLIC_PIX_DISCOUNT_PERCENT > 0 no build), validação no campo, resumo e "Salvar meus dados".
test("checkout em uma página: Pix, validação no campo, salvar e limpar dados", async ({ page, isMobile }) => {
  await page.route("https://viacep.com.br/ws/**", (route) =>
    route.fulfill({ json: { cep: "01310-100", logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" } }),
  );
  const addShirt = async () => {
    await page.goto("/produtos/camiseta-hamilton");
    await page.locator("label[data-sku]:not([data-out])").first().click();
    await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "foi adicionado à sacola" })).toBeVisible();
  };
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await addShirt();
  const pixOnProduct = await page.locator("[data-pix-price]").count();
  await page.goto("/checkout");

  // Uma página só: as quatro seções à vista, nenhum "Continuar"; progresso discreto.
  for (const name of ["Contato", "Entrega", "Envio", "Pagamento"]) await expect(page.getByRole("button", { name: new RegExp(`^\\d?\\s*${name}`) })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Continuar" })).toHaveCount(0);
  await expect(page.getByText("0 de 4 prontas")).toBeVisible();

  // Pix vem primeiro e já marcado.
  const firstMethod = page.locator("input[name=pagamento]").first();
  await expect(firstMethod).toHaveValue("pix");
  await expect(firstMethod).toBeChecked();

  // Validação no campo, ao sair dele.
  await page.getByLabel("E-mail").fill("abc");
  await page.getByLabel("Telefone").click();
  await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  await page.getByLabel("E-mail").fill("teste@exemplo.com");
  await expect(page.getByText("Informe um e-mail válido.")).toHaveCount(0);

  // Teclados certos no celular.
  await expect(page.getByLabel("CEP")).toHaveAttribute("inputmode", "numeric");
  await expect(page.getByLabel("Telefone")).toHaveAttribute("inputmode", "tel");
  await expect(page.getByLabel("CEP")).toHaveAttribute("autocomplete", "postal-code");

  await page.getByLabel("Nome completo").fill("Teste da Silva");
  await page.getByLabel("Telefone").fill("11912345678");
  await page.getByRole("checkbox", { name: "Salvar meus dados neste aparelho" }).check();
  await page.getByLabel("CEP").fill("01310100");
  await expect(page.getByLabel("Rua")).toHaveValue("Avenida Paulista");
  await page.getByLabel("Número").fill("1000");
  // Envio cotado sozinho, a mais barata marcada.
  await expect(page.locator("input[name=entrega]:checked")).toHaveCount(1);
  await expect(page.getByText("3 de 4 prontas")).toBeVisible();

  // Recolher uma seção mostra o resumo dela.
  await page.getByRole("button", { name: /Contato/ }).click();
  await expect(page.getByRole("button", { name: /Contato/ })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Nome completo")).toBeHidden();
  await expect(page.getByRole("button", { name: /Contato/ })).toContainText("teste@exemplo.com");

  // Resumo: recolhível no celular, sempre aberto no desktop.
  const summaryToggle = page.getByRole("button", { name: /^Resumo/ });
  if (isMobile) {
    await expect(summaryToggle).toHaveAttribute("aria-expanded", "false");
    await summaryToggle.click();
  }
  await expect(page.locator("#resumo-conteudo")).toBeVisible();
  if (pixOnProduct) await expect(page.locator("#resumo-conteudo").getByText(/Desconto no Pix \(\d+%\)/)).toBeVisible();

  // Finalizar sem aceitar os termos: o erro aparece no campo. Depois aceita e confirma (no celular, pela barra fixa).
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await expect(page.getByText("É preciso aceitar os Termos de Uso e a Política de Privacidade.")).toBeVisible();
  await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await expect(page).toHaveURL(/\/pedido\/APX-/);
  if (pixOnProduct) await expect(page.getByText(/Desconto no Pix \(\d+%\)/)).toBeVisible();

  // Dados salvos: sem CPF, reaproveitados na próxima compra; "Limpar meus dados" apaga.
  const stored = await page.evaluate(() => localStorage.getItem("apex:checkout:dados:v1") ?? "");
  expect(stored).toContain("Teste da Silva");
  expect(stored).not.toMatch(/cpf|acceptTerms|method/i);
  await addShirt();
  await page.goto("/checkout");
  await expect(page.getByLabel("Nome completo")).toHaveValue("Teste da Silva");
  await expect(page.getByLabel("Rua")).toHaveValue("Avenida Paulista");
  await page.getByRole("button", { name: "Limpar meus dados" }).click();
  await expect(page.getByLabel("Nome completo")).toHaveValue("");
  expect(await page.evaluate(() => localStorage.getItem("apex:checkout:dados:v1"))).toBeNull();
});
