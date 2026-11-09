// Prints do redesign do Kimi (feat/antonelli-2), desktop 1440 e celular 390: home (card dourado na seção de pilotos e a
// barra superior), /pilotos, a ficha do campeão (/pilotos/antonelli, página inteira) e /campeao em 3 momentos (p = 0,
// .46 e .9). Também a comparação de tipografia do "Kimi" com original.png (tipografia-original-x-site-2.png).
// Uso (site rodando): node scripts/qa/antonelli2-prints.mjs [base=http://localhost:3001] [pasta=docs/antonelli/prints]
// Sem Edge: PW_EXECUTABLE_PATH=/caminho/do/chromium.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3001";
const dir = process.argv[3] ?? "docs/antonelli/prints";
const only = process.env.ONLY?.split(",");
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : { channel: "msedge" });

const wait = (page, ms) => page.waitForTimeout(ms);
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  // Carrega as imagens lazy rolando a página inteira e volta.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await wait(page, 600);
}
async function shot(page, file, options = {}) {
  // Página inteira: sem o rodapé (no dev ele mostra os dados de contato do .env.local).
  if (options.fullPage) await page.addStyleTag({ content: "footer { display: none !important; }" });
  const buffer = await page.screenshot({ ...options, type: "jpeg", quality: 82 });
  fs.writeFileSync(path.join(dir, file), buffer);
  console.log(file);
}
async function scrollToP(page, p) {
  await page.evaluate((value) => {
    const section = document.querySelector(".campeao-cena");
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.round(top + (section.offsetHeight - window.innerHeight) * value));
  }, p);
}

for (const [name, viewport, mobile] of [["desktop-1440", { width: 1440, height: 900 }, false], ["celular-390", { width: 390, height: 844 }, true]]) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  const want = (key) => !only || only.includes(key);

  if (want("home")) {
    await page.goto(base + "/", { waitUntil: "networkidle" });
    await settle(page);
    await shot(page, `a2-${name}-home-topo.jpg`);
    await page.locator("#pilotos").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.querySelector("#pilotos").scrollIntoView({ block: "start" }));
    await wait(page, 1500);
    await shot(page, `a2-${name}-home-card.jpg`, { fullPage: false });
    await page.locator("#pilotos").screenshot({ path: path.join(dir, `a2-${name}-home-pilotos.jpg`), type: "jpeg", quality: 82 });
    console.log(`a2-${name}-home-pilotos.jpg`);
  }
  if (want("pilotos")) {
    await page.goto(base + "/pilotos", { waitUntil: "networkidle" });
    await settle(page);
    await shot(page, `a2-${name}-pilotos.jpg`, { fullPage: true });
  }
  if (want("ficha")) {
    await page.goto(base + "/pilotos/antonelli", { waitUntil: "networkidle" });
    await settle(page);
    await shot(page, `a2-${name}-ficha-topo.jpg`);
    await shot(page, `a2-${name}-ficha-inteira.jpg`, { fullPage: true });
  }
  if (want("campeao")) {
    await page.goto(base + "/campeao", { waitUntil: "networkidle" });
    await page.waitForSelector(".campeao-fixo[data-ready]");
    await page.evaluate(() => document.fonts.ready);
    for (const [p, label] of [[0, "p0"], [0.46, "p046"], [0.9, "p09"]]) {
      // Rolagem em passos até p (a cena é dirigida pela rolagem).
      for (let q = 0; q <= p + 0.001; q += 0.05) {
        await scrollToP(page, Math.min(q, p));
        await wait(page, 40);
      }
      await scrollToP(page, p);
      await wait(page, p >= 0.58 ? 2600 : 500);
      await shot(page, `a2-${name}-campeao-${label}.jpg`);
    }
  }
  await context.close();
}

// Tipografia: o título do protótipo aprovado (original.png, 1672 px) × o nosso em p = .9 num palco de 1672 px (viewport
// 1672 × 941, DPR 1), no mesmo recorte.
if (!only || only.includes("tipografia")) {
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(base + "/campeao", { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "header, [data-dock], .whatsapp-fab, nextjs-portal, #aviso-campeao { display: none !important; } .campeao-palco { -webkit-mask-image: none !important; mask-image: none !important; }" });
  await page.waitForSelector(".campeao-fixo[data-ready]");
  await page.evaluate(() => document.fonts.ready);
  for (let q = 0; q <= 0.9; q += 0.05) {
    await scrollToP(page, q);
    await wait(page, 40);
  }
  await scrollToP(page, 0.9);
  await wait(page, 2600);
  const stage = await page.locator(".campeao-palco").screenshot({ animations: "disabled" });
  const ours = await sharp(stage).resize(1672, 941).toBuffer();
  const crop = { left: 520, top: 30, width: 632, height: 240 };
  const a = await sharp("public/images/campeao/Kimi e a coroa dourada.png").extract(crop).toBuffer();
  const b = await sharp(ours).extract(crop).toBuffer();
  const weight = await page.locator(".campeao-titulo b").evaluate((el) => `${getComputedStyle(el).fontWeight} · ${getComputedStyle(el).fontSize}`);
  const lab = (text) => Buffer.from(`<svg width="632" height="30"><rect width="632" height="30" fill="#0d0d0d"/><text x="10" y="20" font-family="Arial" font-size="15" fill="#fff">${text}</text></svg>`);
  const diff = await sharp(a).composite([{ input: b, blend: "darken" }]).toBuffer();
  await sharp({ create: { width: 632 * 3 + 24, height: 270, channels: 3, background: "#fff" } })
    .composite([
      { input: lab("original.png (aprovada)"), left: 0, top: 0 }, { input: a, left: 0, top: 30 },
      { input: lab(`site: Inter ${weight} (p = .9)`), left: 644, top: 0 }, { input: b, left: 644, top: 30 },
      { input: lab("os dois sobrepostos (darken)"), left: 1288, top: 0 }, { input: diff, left: 1288, top: 30 },
    ])
    .png()
    .toFile(path.join(dir, "tipografia-original-x-site-2.png"));
  console.log("tipografia-original-x-site-2.png");
  await context.close();
}
await browser.close();
