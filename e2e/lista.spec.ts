import { expect, test } from "./fixtures";

// Lista de desejos compartilhável (loja extra, item 4). Modo seed (sem banco): link completo /desejos?l=...&n=...
test("lista de desejos: compartilhar, abrir o link, peça indisponível e adicionar à sacola", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("apex:favoritos:v1", JSON.stringify(["camiseta-ferrari-2026", "bone-hamilton"])));
  await page.goto("/favoritos");
  const share = page.getByRole("region", { name: "Compartilhar minha lista" });
  await share.getByLabel("Seu nome (opcional)").fill("Rafa");
  await share.getByRole("button", { name: "WhatsApp" }).waitFor();
  // Copiar gera o link (e mostra no campo, para quem não tem área de transferência).
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await share.getByRole("button", { name: /Copiar link|Link copiado/ }).click();
  const link = await share.locator("[data-wishlist-link]").inputValue();
  expect(link).toMatch(/\/desejos\?l=[0-9a-z.]+&n=Rafa$/);

  // Quem recebe: outra visita (sacola e favoritos vazios), com uma peça a mais que não existe.
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${new URL(link).pathname}${new URL(link).search.replace("&n=", ".zz&n=")}`);
  await expect(page.getByRole("heading", { level: 1, name: "A lista de Rafa" })).toBeVisible();
  await expect(page.locator("meta[name=robots]")).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("main").getByRole("heading", { level: 3 })).toHaveText(["Camiseta Ferrari 2026", "Boné Hamilton"]);
  await expect(page.locator("[data-unavailable]")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Criar a minha lista" })).toHaveAttribute("href", "/favoritos");

  await page.getByRole("button", { name: "Adicionar Boné Hamilton à sacola" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Boné Hamilton foi adicionado à sacola" })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar Camiseta Ferrari 2026 à sacola" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Escolha o tamanho.");
  await page.getByLabel("Tamanho de Camiseta Ferrari 2026").selectOption({ label: "M" });
  await page.getByRole("button", { name: "Adicionar Camiseta Ferrari 2026 à sacola" }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("apex:sacola:v1") ?? "[]").length)).toBe(2);
});
