import { expect, test as base } from "@playwright/test";

// `page.goto` que espera a HIDRATAÇÃO (marca data-hydrated no <html>, components/hydration-mark.tsx) antes de seguir:
// no `next dev`, o primeiro clique podia acontecer antes do React ligar os eventos e se perder. Sem esperas fixas.
export const test = base.extend({
  page: async ({ page }, provide) => {
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      await page.waitForFunction(() => document.documentElement.hasAttribute("data-hydrated"), null, { timeout: 30_000 });
      return response;
    };
    await provide(page);
  },
});

export { expect };
