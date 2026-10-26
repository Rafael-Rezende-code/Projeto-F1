// Print da página INTEIRA em desktop (1440) e celular (390), rolando antes para montar o que entra por
// IntersectionObserver. Uso: node scripts/qa/pagina-inteira.mjs <pasta> [rota=/] [http://localhost:3001]
// Saída: <pasta>/<nome>-desktop.jpg e <nome>-celular.jpg, mais a lista de seções (id/título) em ordem.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2] ?? "docs/refino-3/prints";
const route = process.argv[3] ?? "/";
const base = process.argv[4] ?? "http://localhost:3001";
const name = route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/[/?=&]+/g, "-");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", ...(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH, channel: undefined } : {}) });
for (const [label, viewport, mobile] of [["desktop", { width: 1440, height: 900 }, false], ["celular", { width: 390, height: 844 }, true]]) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(base + route, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
  const sections = await page.evaluate(() =>
    [...document.querySelectorAll("main > section, main > div > section, main > [data-section]")].map((el) => {
      const title = el.querySelector("h1, h2")?.textContent?.trim().replace(/\s+/g, " ").slice(0, 60) ?? "";
      return `${el.id ? `#${el.id} ` : ""}${title}`;
    }),
  );
  if (label === "desktop") console.log(sections.map((section, index) => `${index + 1}. ${section}`).join("\n"));
  await page.screenshot({ path: path.join(out, `${name}-${label}.jpg`), type: "jpeg", quality: 60, fullPage: true });
  console.log(label, "ok");
  await context.close();
}
await browser.close();
