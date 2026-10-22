import { expect, test } from "./fixtures";

// Consulta de pedido (operação 1d). Sem Supabase (como no e2e) a consulta responde que ainda não está ativa; a busca
// de verdade (número + e-mail, mesma resposta para "não existe" e "e-mail errado") é testada no banco simulado
// (supabase/tests/consulta.test.ts).
test("consulta de pedido: link no rodapé, formulário acessível e resposta sem quebrar a página", async ({ page }) => {
  await page.goto("/");
  // no celular o grupo do rodapé é um acordeão fechado: confere o link e navega direto
  await expect(page.locator('footer a[href="/pedido/consultar"]').first()).toBeAttached();
  await page.goto("/pedido/consultar");
  await page.getByLabel("Número do pedido").fill("APX-TESTE-0001");
  await page.getByLabel("E-mail da compra").fill("maria@exemplo.com");
  await page.getByRole("button", { name: "Consultar pedido" }).click();
  await expect(page.locator("#consulta-erro")).toContainText(/ainda não está ativa|Não encontramos/);
  // os campos continuam preenchidos depois da resposta
  await expect(page.getByLabel("E-mail da compra")).toHaveValue("maria@exemplo.com");
});
