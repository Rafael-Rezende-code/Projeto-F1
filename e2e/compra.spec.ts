import { expect, test } from "@playwright/test";

// Fluxo completo: home → equipe → produto → tamanho → sacola → checkout simulado → confirmação.
test("compra de ponta a ponta (pedido simulado)", async ({ page, isMobile }) => {
  // ViaCEP simulado: o teste não depende da rede externa.
  await page.route("https://viacep.com.br/ws/**", (route) =>
    route.fulfill({ json: { cep: "01310-100", logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" } }),
  );

  await page.goto("/");
  await page.evaluate(() => localStorage.clear());

  // Home → equipe (card McLaren em "Com quem você corre?")
  await page.locator("#teams").getByRole("link", { name: "McLaren" }).click();
  await expect(page).toHaveURL(/\/equipes\/mclaren$/);
  await expect(page.getByRole("heading", { level: 1, name: "McLaren" })).toBeVisible();

  // Equipe → produto com tamanhos
  await page.getByRole("link", { name: "Camiseta McLaren 2026", exact: true }).click();
  await expect(page).toHaveURL(/\/produtos\/camiseta-mclaren-2026$/);

  // Sem tamanho: aviso. Depois escolhe o primeiro tamanho disponível e adiciona.
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
  await expect(page.getByText("Escolha um tamanho.")).toBeVisible();
  await page.locator("label:has(input[name=tamanho]:not([disabled]))").first().click();
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("foi adicionado à sacola");

  // Sacola (gaveta) → página do carrinho. No celular a sacola fica só no dock (o cabeçalho tem só a marca).
  if (isMobile) await page.getByRole("navigation", { name: "Atalhos" }).getByRole("button", { name: /^Sacola/ }).click();
  else await page.getByRole("button", { name: /Sacola de compras, 1 item/ }).click();
  const drawer = page.getByRole("dialog", { name: /Sacola/ });
  await expect(drawer.getByText("Camiseta McLaren 2026")).toBeVisible();
  await drawer.getByRole("link", { name: "Ver sacola completa" }).click();
  await expect(page).toHaveURL(/\/carrinho$/);
  await page.getByRole("link", { name: "Finalizar compra" }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  // Contato (sem CPF: ele só é pedido no boleto)
  await page.getByLabel("Nome completo").fill("Teste da Silva");
  await page.getByLabel("E-mail").fill("teste@exemplo.com");
  await page.getByLabel("Telefone").fill("11912345678");
  await expect(page.getByLabel("CPF")).toHaveCount(0);
  await page.getByRole("button", { name: "Continuar" }).click();

  // Endereço (ViaCEP preenche rua, bairro, cidade e UF)
  await page.getByLabel("CEP").fill("01310100");
  await expect(page.getByLabel("Rua")).toHaveValue("Avenida Paulista");
  await page.getByLabel("Número").fill("1000");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Entrega
  await page.getByText("Expressa").click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Pagamento: aceite obrigatório; Pix e cartão sem CPF
  await page.getByText("Cartão de crédito").click();
  await expect(page.getByLabel("CPF")).toHaveCount(0);
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await expect(page.getByText("É preciso aceitar os Termos de Uso e a Política de Privacidade.")).toBeVisible();
  await page.getByRole("checkbox").check();

  // Boleto: CPF obrigatório, com validação dos dígitos
  await page.getByText("Boleto", { exact: true }).click();
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await expect(page.getByText("Informe o CPF para emitir o boleto.")).toBeVisible();
  await page.getByLabel("CPF").fill("52998224724");
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await expect(page.getByText("CPF inválido. Confira os números.")).toBeVisible();
  await page.getByLabel("CPF").fill("52998224725");
  await expect(page.getByLabel("CPF")).toHaveValue("529.982.247-25");
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();

  // Confirmação
  await expect(page).toHaveURL(/\/pedido\/APX-/);
  await expect(page.getByRole("heading", { level: 1, name: "Pedido recebido." })).toBeVisible(); // boleto: pagamento pendente
  // exact: o aviso "... foi adicionado à sacola" pode ainda estar na tela quando o fluxo é rápido (build de produção)
  await expect(page.getByText("Camiseta McLaren 2026", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("apex:sacola:v1"))).toBe("[]");
});
