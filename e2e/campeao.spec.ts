import { expect, test } from "./fixtures";

// Sessão do Campeão (feat/antonelli, feat/antonelli-2): /campeao rolada até o fim e de volta, card dourado e aviso da home, card em
// /pilotos, coleção vazia ("Em breve") e o redirecionamento 308. A coleção COM produto é testada contra o banco real em
// e2e/banco-real.spec.ts (produto de teste com a tag antonelli, criado por scripts/qa/dados-de-teste.mjs).

async function scrollToP(page: import("@playwright/test").Page, p: number) {
  await page.evaluate((value) => {
    const section = document.querySelector(".campeao-cena") as HTMLElement;
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.round(top + (section.offsetHeight - window.innerHeight) * value));
  }, p);
}

test("/campeao: a coroação acompanha a rolagem até o fim e volta", async ({ page }) => {
  await page.goto("/campeao");
  const heading = page.getByRole("heading", { level: 1, name: "The Champion. Kimi" });
  await expect(heading).toBeAttached();
  await expect(page.locator(".campeao-fixo[data-ready]")).toBeAttached();
  const title = page.locator(".campeao-titulo small");
  await expect(page.locator(".campeao-dica").first()).toBeAttached();

  // Rolagem progressiva até o fim (p = 1), em passos, como um usuário.
  for (let p = 0.1; p <= 1.001; p += 0.1) {
    await scrollToP(page, p);
    await page.waitForTimeout(80);
  }
  await expect(title).toHaveText("THE CHAMPION");
  await expect(page.locator(".campeao-assenta.is-pouso")).toBeAttached();
  await expect(page.locator(".campeao-selo.is-on").first()).toBeAttached();
  await expect(page.locator(".campeao-dica")).toHaveCount(0);
  const crown = await page.locator(".campeao-coroa").evaluate((el) => getComputedStyle(el).transform);
  expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(crown);

  // De volta para cima: o encaixe se desfaz (reversível) e o título volta a ter o cursor.
  await scrollToP(page, 0.3);
  await expect(page.locator(".campeao-assenta.is-pouso")).toHaveCount(0);
  await expect(title).toHaveText("THE CHAMPI..");
  await expect(page.locator(".campeao-selo.is-on")).toHaveCount(0);

  // Capítulos seguintes: bandeira com os números e a coleção vazia (seed sem produto com a tag antonelli).
  await page.locator("#bandeira").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { level: 2, name: "A espera acabou." })).toBeVisible();
  await expect(page.locator("#bandeira dd")).toHaveCount(3);
  await page.locator("#colecao").scrollIntoViewIfNeeded();
  await expect(page.locator("#colecao").getByRole("heading", { level: 2, name: "Em breve." })).toBeVisible();
  await expect(page.locator("#colecao").getByRole("link", { name: "Quero saber primeiro" })).toHaveAttribute("href", "/#newsletter");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test("home: card dourado do campeão (sem a capa estática) leva a /campeao; aviso dispensável sem salto; barra dourada", async ({ page }) => {
  await page.goto("/");
  // A capa estática saiu (feat/antonelli-2) e a cena da rolagem continua só em /campeao.
  await expect(page.locator(".campeao-capa")).toHaveCount(0);
  await expect(page.locator(".campeao-cena")).toHaveCount(0);
  const card = page.locator("article.gold-anim").filter({ hasText: "Kimi" });
  await expect(card).toHaveCount(1);
  await expect(card.getByRole("heading", { level: 3, name: /Kimi Antonelli/ })).toBeAttached();
  await expect(card).toContainText("Campeão mundial 2026 · o mais jovem da história");
  // Barra superior dourada (decidida no navegador até CAMPEAO_DESTAQUE_ATE).
  const gold = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--barra-ouro").trim());
  expect(gold).toBe("1");

  const notice = page.locator("#aviso-campeao");
  await expect(notice).toBeVisible();
  const heroBefore = await page.locator("section.hero-type").boundingBox();
  await notice.getByRole("button", { name: "Dispensar o aviso do campeão" }).click();
  await expect(notice).toHaveCount(0);
  const heroAfter = await page.locator("section.hero-type").boundingBox();
  expect(heroAfter?.y).toBe(heroBefore?.y);
  await page.reload();
  await expect(page.locator("#aviso-campeao")).toBeHidden();

  await card.scrollIntoViewIfNeeded();
  await expect(card.getByRole("link", { name: "Ver a ficha do campeão" })).toHaveAttribute("href", "/pilotos/antonelli");
  await card.getByRole("link", { name: /Reviva a coroação/ }).click();
  await expect(page).toHaveURL(/\/campeao$/);
});

test("/pilotos: card dourado do campeão vem primeiro e abre a ficha do campeão", async ({ page }) => {
  await page.goto("/pilotos");
  const card = page.locator("article.gold-anim").first();
  await expect(card.getByRole("heading", { level: 2, name: /Kimi Antonelli/ })).toBeVisible();
  // O card do campeão vem antes da lista dos outros pilotos.
  const order = await page.evaluate(() => {
    const champion = document.querySelector("article.gold-anim");
    const list = document.querySelector('[role="list"][aria-label="Pilotos"]');
    return champion && list ? champion.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING : 0;
  });
  expect(order).toBeTruthy();
  await card.getByRole("link", { name: /Ver a ficha do campeão/ }).click();
  await expect(page).toHaveURL(/\/pilotos\/antonelli$/);

  // Ficha: nome, fita, até 4 números, linha do tempo, galeria, coleção vazia e o card da coroação.
  await expect(page.getByRole("heading", { level: 1, name: /Kimi Antonelli/ })).toBeVisible();
  await expect(page.getByText("Campeão Mundial 2026", { exact: true })).toBeVisible();
  expect(await page.locator('section[aria-labelledby="ficha-numeros"] dd').count()).toBeLessThanOrEqual(4);
  await expect(page.locator('section[aria-labelledby="ficha-trajetoria"] li')).toHaveCount(4);
  expect(await page.locator('section[aria-labelledby="ficha-galeria"] img').count()).toBeGreaterThanOrEqual(4);
  await page.locator("#colecao-do-kimi").scrollIntoViewIfNeeded();
  await expect(page.locator("#colecao-do-kimi").getByRole("heading", { level: 2, name: "Em breve." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Reviva a coroação/ })).toHaveAttribute("href", "/campeao");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test("/colecao/campeao-2026 redireciona (308) para a coleção do campeão", async ({ request }) => {
  const response = await request.get("/colecao/campeao-2026", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toMatch(/\/campeao#colecao$/);
});
