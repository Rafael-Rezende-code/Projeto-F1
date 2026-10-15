import { expect, test } from "@playwright/test";

// Busca (Ctrl/Cmd+K no desktop, item Buscar do dock no celular) e navegação pelos resultados com o teclado.
test("busca: abre, mostra resultados e navega com o teclado", async ({ page, isMobile }) => {
  await page.goto("/produtos");
  if (isMobile) {
    const dock = page.getByRole("navigation", { name: "Atalhos" });
    await expect(dock).toBeVisible();
    await dock.getByRole("button", { name: "Buscar" }).click();
  } else {
    await expect(page.getByRole("navigation", { name: "Atalhos" })).toBeHidden();
    await page.keyboard.press("Control+k");
  }
  const dialog = page.getByRole("dialog", { name: "Buscar" });
  const input = dialog.getByRole("combobox", { name: "Buscar na loja" });
  await expect(input).toBeFocused();
  // Estado vazio com sugestões de equipes e pilotos
  await expect(dialog.getByRole("link", { name: "Lando Norris" })).toBeVisible();

  await input.fill("norris");
  const options = dialog.getByRole("option");
  await expect(options.first()).toBeVisible();
  await expect(dialog.getByRole("option", { name: /Lando Norris/ }).last()).toBeVisible();

  // Setas + Enter abrem o resultado destacado
  await input.press("ArrowDown");
  const selected = dialog.locator('[role="option"][aria-selected="true"]');
  const href = await selected.getAttribute("href");
  await input.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(dialog).toBeHidden();
});

test("busca sem resultado e Esc fecha", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("navigation", { name: "Atalhos" }).getByRole("button", { name: "Buscar" }).click();
  else await page.getByRole("button", { name: "Buscar (Ctrl+K)" }).click();
  const dialog = page.getByRole("dialog", { name: "Buscar" });
  await dialog.getByRole("combobox").fill("xyzw");
  await expect(dialog.getByText("Nenhum resultado para “xyzw”.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("dock no celular: some no checkout e abre a sacola", async ({ page, isMobile }) => {
  test.skip(!isMobile, "o dock só existe no celular");
  await page.goto("/equipes");
  const dock = page.getByRole("navigation", { name: "Atalhos" });
  await expect(dock.getByRole("button", { name: "Equipes" })).toHaveAttribute("aria-current", "page");
  await dock.getByRole("button", { name: /^Sacola/ }).click();
  await expect(page.getByRole("dialog", { name: /Sacola/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/checkout");
  await expect(page.getByRole("navigation", { name: "Atalhos" })).toHaveCount(0);
});
