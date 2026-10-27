import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "./fixtures";

// Build de PRODUÇÃO com o Supabase real e dados de TESTE (loja extra, QA): corridas, drops, personalização até a fila do
// fornecedor e lista de desejos com link curto. Antes do build: `node scripts/qa/dados-de-teste.mjs criar`; depois do
// teste: `... apagar`. Servidor: `node .claude/qa-server.cjs build` e `start -p 3001` (inclui o administrador temporário
// qa-teste-admin@example.com, criado aqui com senha aleatória que só existe na memória e apagado no fim).
// Rodar: E2E_DB=1 E2E_BASE_URL=http://localhost:3001 npx playwright test e2e/banco-real.spec.ts
test.skip(!process.env.E2E_DB, "precisa do build com o Supabase real e dos dados de teste (E2E_DB=1)");

const env = () => Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m![1], m![2].trim()]));
const ADMIN = "qa-teste-admin@example.com";
const password = randomBytes(24).toString("base64url");
let adminId = "";

test.beforeAll(async () => {
  if (!process.env.E2E_DB) return;
  const vars = env();
  const db = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const users = await db.auth.admin.listUsers({ perPage: 200 });
  for (const user of users.data.users.filter((item) => item.email === ADMIN)) await db.auth.admin.deleteUser(user.id);
  const created = await db.auth.admin.createUser({ email: ADMIN, password, email_confirm: true });
  adminId = created.data.user?.id ?? "";
  await db.from("admin_emails").upsert({ email: ADMIN }, { onConflict: "email" });
});

test.afterAll(async () => {
  if (!process.env.E2E_DB) return;
  const vars = env();
  const db = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  if (adminId) await db.auth.admin.deleteUser(adminId);
  await db.from("admin_emails").delete().eq("email", ADMIN);
});

test("corridas e drops no build de produção (dados de teste no banco)", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  const race = page.locator("[data-next-race]");
  await expect(race).toContainText("[TESTE] GP de Teste");
  await expect(race.getByRole("definition").first()).toHaveText(/^\d{2}$/);
  await race.getByRole("button", { name: "Brasília" }).click();
  await expect(race).toContainText("(Brasília)");
  await expect(race.getByRole("link", { name: /Ver a coleção do fim de semana/ })).toHaveAttribute("href", "/produtos?tag=camiseta");
  await expect(page.locator("[data-drops-home]")).toContainText("[TESTE] Drop em breve");
  if (!isMobile) await expect(page.locator("header").first().getByRole("link", { name: "Drops", exact: true })).toBeVisible();
  await page.goto("/pilotos/hamilton");
  await expect(page.locator("[data-next-race]")).toContainText("[TESTE] GP de Teste");

  // Drop em breve: contagem, lista de espera (gravação anônima) e produto sem compra.
  await page.goto("/drops/teste-em-breve");
  await expect(page.getByLabel("Tempo até o lançamento")).toBeVisible();
  const form = page.locator("#lista-de-espera");
  await form.getByLabel("E-mail", { exact: true }).fill(`qa-teste-lista-${isMobile ? "m" : "d"}@example.com`);
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Avise-me" }).click();
  await expect(form.getByRole("status")).toContainText("Pronto!");
  await page.goto("/produtos/bone-hamilton");
  await expect(page.locator("[data-drop-status]")).toContainText("Em breve");
  await expect(page.getByRole("button", { name: "Em breve", exact: true })).toBeDisabled();

  // Pré-venda lançada: previsão de envio e limite de 2 por pedido.
  await page.goto("/produtos/poster-hamilton");
  await expect(page.locator("[data-drop-status]")).toContainText("Envio previsto: a partir de 20/12");
  const add = page.getByRole("button", { name: "Adicionar à sacola", exact: true });
  await add.click();
  await add.click();
  await add.click();
  await expect(page.getByRole("status").filter({ hasText: "Limite de 2 por pedido" })).toBeVisible();
});

test("personalização do produto até a fila do fornecedor; lista de desejos com link curto", async ({ page, isMobile }) => {
  test.setTimeout(240_000);
  const tag = isMobile ? "m" : "d";
  const email = `qa-teste-${tag}-${Date.now()}@example.com`;
  await page.route("https://viacep.com.br/ws/**", (route) =>
    route.fulfill({ json: { cep: "01310-100", logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" } }),
  );
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/produtos/moletom-ferrari");
  await page.locator("label[data-sku]:not([data-out])").first().click();
  await page.getByRole("checkbox", { name: /Personalizar com nome e número/ }).check();
  const name = page.getByLabel(/^Nome \(até 12\)/);
  const number = page.getByLabel("Número", { exact: true });
  // Nome longo (limite 12), caracteres inválidos, número fora da faixa e nome da lista de bloqueio.
  await name.fill("abcdefghijklmnop");
  await expect(name).toHaveValue("ABCDEFGHIJKL");
  await name.fill("joão@#!");
  await expect(name).toHaveValue("JOAO");
  await number.fill("100");
  await expect(number).toHaveValue("10");
  await name.fill("porra");
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
  await expect(page.getByText("Esse nome não pode ser estampado. Escolha outro.")).toBeVisible();
  await name.fill("Teste QA");
  await number.fill("7");
  await expect(page.locator("figure svg textPath")).toHaveText("TESTE QA");
  await page.screenshot({ path: `docs/loja-extra/personalizacao/1-produto-${tag}.png` });
  await page.getByRole("button", { name: "Adicionar à sacola", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "foi adicionado à sacola" })).toBeVisible();

  await page.goto("/carrinho");
  await expect(page.locator("[data-personalization]").first()).toContainText("Nome: TESTE QA · Nº 7");
  await page.screenshot({ path: `docs/loja-extra/personalizacao/2-sacola-${tag}.png` });
  await page.goto("/checkout");
  await page.getByLabel("Nome completo").fill("Teste QA");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Telefone").fill("11912345678");
  await page.getByLabel("CEP").fill("01310100");
  await expect(page.getByLabel("Rua")).toHaveValue("Avenida Paulista");
  await page.getByLabel("Número", { exact: true }).fill("1000");
  await expect(page.locator("input[name=entrega]:checked")).toHaveCount(1);
  await page.getByText("Cartão de crédito").click();
  await expect(page.locator("[data-personalization]").first()).toContainText("Nome: TESTE QA · Nº 7");
  await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await expect(page).toHaveURL(/\/pedido\/APX-/);
  const orderId = new URL(page.url()).pathname.split("/").pop()!;
  await expect(page.locator("[data-personalization]")).toContainText("Nome: TESTE QA · Nº 7");
  await page.screenshot({ path: `docs/loja-extra/personalizacao/3-confirmacao-${tag}.png`, fullPage: true });

  await page.goto("/pedido/consultar");
  await page.getByLabel("Número do pedido").fill(orderId);
  await page.getByLabel("E-mail da compra").fill(email);
  await page.getByRole("button", { name: "Consultar pedido" }).click();
  await expect(page.locator("[data-personalization]")).toContainText("Nome: TESTE QA · Nº 7");
  await page.screenshot({ path: `docs/loja-extra/personalizacao/4-consulta-${tag}.png`, fullPage: true });

  // Painel (administrador temporário): fila "Comprar no fornecedor" e detalhe do pedido.
  await page.goto("/admin/entrar");
  await page.getByLabel("E-mail").fill(ADMIN);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await page.waitForURL(/\/admin(?!\/entrar)/);
  await page.goto("/admin/fornecedor");
  const item = page.locator("li", { hasText: orderId });
  await expect(item.locator("[data-personalization]")).toContainText("Nome: TESTE QA · Nº 7");
  await page.screenshot({ path: `docs/loja-extra/personalizacao/5-fornecedor-${tag}.png`, fullPage: true });
  await page.goto(`/admin/pedidos/${orderId}`);
  await expect(page.locator("[data-personalization]").first()).toContainText("Nome: TESTE QA · Nº 7");

  // Lista de desejos com link curto (Supabase): cria e abre.
  await page.evaluate(() => localStorage.setItem("apex:favoritos:v1", JSON.stringify(["camiseta-ferrari-2026", "bone-norris"])));
  await page.goto("/favoritos");
  const shareBox = page.getByRole("region", { name: "Compartilhar minha lista" });
  await shareBox.getByLabel("Seu nome (opcional)").fill("QA Teste");
  await shareBox.getByRole("button", { name: /Copiar link|Link copiado/ }).click();
  const link = await shareBox.locator("[data-wishlist-link]").inputValue();
  expect(link).toMatch(/\/desejos\/[A-Za-z0-9]{10}$/);
  await page.goto(new URL(link).pathname);
  await expect(page.getByRole("heading", { level: 1, name: "A lista de QA Teste" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("heading", { level: 3 })).toHaveText(["Camiseta Ferrari 2026", "Boné Norris"]);
});
