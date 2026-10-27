import { expect, test } from "./fixtures";

// Vitrine (refino 3): home, coleção, presentes, catálogo (filtros, chips, carregar mais) e produto (galeria, estoque baixo,
// avise-me, sem guia de tamanhos). Roda com o seed (sem Supabase): o "Avise-me" aparece desabilitado, com "Em breve".

test("home: Mais vendidos com 8 produtos antes das coleções, sem vitrines repetidas", async ({ page }) => {
  await page.goto("/");
  const best = page.locator("#mais-vendidos");
  await expect(best.getByRole("heading", { name: "Mais vendidos" })).toBeAttached();
  await expect(best.locator("article")).toHaveCount(8);
  const order = await page.evaluate(() => ["mais-vendidos", "collection", "novidades", "presentes"].map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? -1));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  // nenhum produto aparece em duas vitrines (Mais vendidos, Novidades)
  const names = await page.locator("#mais-vendidos article h3, #novidades article h3").allTextContents();
  expect(new Set(names).size).toBe(names.length);
  await expect(page.getByRole("heading", { name: "Essenciais do dia de prova" })).toHaveCount(0);
});

test("coleção: capa, destaque e grade; coleção vazia mostra Em breve com link para a newsletter", async ({ page }) => {
  await page.goto("/colecoes/miniaturas");
  await expect(page.getByRole("heading", { level: 1, name: "Miniaturas" })).toBeVisible();
  await expect(page.getByText("Destaque", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Filtrar no catálogo/ })).toHaveAttribute("href", "/produtos?colecao=miniaturas");
  await page.goto("/colecoes/canecas");
  await expect(page.getByRole("heading", { name: "Esta coleção ainda está nos boxes." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Quero saber primeiro" })).toHaveAttribute("href", "/#newsletter");
});

test("presentes: chips por faixa de preço filtram pela URL e a grade bate com a contagem", async ({ page }) => {
  await page.goto("/presentes");
  const chip = page.getByRole("navigation", { name: "Faixas de preço" }).getByRole("link", { name: /Até R\$ 100/ });
  const count = Number((await chip.locator("span").last().textContent())?.trim());
  await chip.click();
  await expect(page).toHaveURL(/faixa=ate-100/);
  await expect(page.locator("main article")).toHaveCount(count);
});

test("catálogo: filtro, chip removível, Carregar mais e estado vazio com sugestão", async ({ page, isMobile }) => {
  await page.goto("/produtos");
  if (isMobile) {
    await page.getByRole("button", { name: /^Filtrar/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filtrar produtos" });
    await sheet.getByText("Sob encomenda", { exact: true }).click();
    const apply = sheet.getByRole("button", { name: /^Ver \d+ produtos?$/ });
    const label = await apply.textContent();
    await apply.click();
    await expect(page).toHaveURL(/entrega=encomenda/);
    await expect(page.getByText(`${label?.replace("Ver ", "")}`, { exact: true })).toBeVisible();
  } else {
    await page.locator("#lateral-entrega-encomenda").click(); // aplica na hora (navega)
    await expect(page).toHaveURL(/entrega=encomenda/);
  }
  const chips = page.getByRole("list", { name: "Filtros ativos" });
  await expect(chips.getByRole("link", { name: "Remover filtro Sob encomenda" })).toBeVisible();
  await chips.getByRole("link", { name: "Remover filtro Sob encomenda" }).click();
  await expect(page).toHaveURL(/\/produtos$/);

  // Carregar mais: anexa a página 2 sem recarregar e troca a URL; a URL abre a mesma lista
  await expect(page.locator("main article")).toHaveCount(12);
  await page.getByRole("link", { name: "Carregar mais" }).click();
  await expect(page.locator("main article")).toHaveCount(24);
  await expect(page).toHaveURL(/pagina=2/);
  await page.reload();
  await expect(page.locator("main article")).toHaveCount(24);

  await page.goto("/produtos?equipe=haas&categoria=colecionaveis");
  await page.getByRole("link", { name: "Remover “Haas”" }).click();
  await expect(page).toHaveURL(/categoria=colecionaveis$/);
  await expect(page.locator("main article").first()).toBeVisible();
});

test("produto: galeria em tela cheia com teclado, estoque baixo, avise-me desabilitado sem banco e sem guia de tamanhos", async ({ page }) => {
  await page.goto("/produtos/scuderia-racing-jacket");
  await expect(page.getByText(/guia de tamanhos/i)).toHaveCount(0);
  await page.getByRole("button", { name: /Ampliar foto em tela cheia/ }).click();
  const viewer = page.getByRole("dialog", { name: /Fotos de/ });
  await expect(viewer.getByText("1 / 2")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText("2 / 2")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();

  await page.locator("fieldset label", { hasText: /^GG$/ }).click();
  await expect(page.getByText("Restam 2 unidades no tamanho GG")).toBeVisible();
  await page.locator("fieldset label", { hasText: /^G\s*,?\s*esgotado/ }).click();
  await expect(page.getByText("Avise-me quando chegar (tamanho G)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Em breve" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Esgotado neste tamanho" })).toBeDisabled();
});
