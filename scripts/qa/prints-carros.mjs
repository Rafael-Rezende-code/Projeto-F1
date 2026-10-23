// Prints do carro parado nas 4 páginas, desktop e celular. Uso: node scripts/qa/prints-carros.mjs <pasta> [http://localhost:3000]
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2] ?? "docs/carros/prints-sem-destaque";
const base = process.argv[3] ?? "http://localhost:3000";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
for (const [name, vp, mobile] of [["desktop", { width: 1440, height: 900 }, false], ["celular", { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  for (const slug of ["norris", "verstappen", "hamilton", "bortoleto"]) {
    await page.goto(`${base}/pilotos/${slug}`, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    // o slot visível (a página renderiza duas cópias; uma fica display:none)
    const slot = page.locator(".driver-car").locator("visible=true").first();
    await slot.scrollIntoViewIfNeeded();
    await page.waitForTimeout(5500);
    const box = await slot.boundingBox();
    const pad = 70;
    await page.screenshot({ path: path.join(out, `${slug}-${name}.jpg`), type: "jpeg", quality: 88, clip: { x: 0, y: Math.max(0, box.y - pad), width: vp.width, height: Math.min(vp.height, box.height + pad * 2) } });
    console.log(name, slug, "ok");
  }
  await ctx.close();
}
await browser.close();
