// Prints da Coroação (Sessão do Campeão) em pontos exatos de p (progresso da rolagem dentro da seção) e larguras fixas,
// mais a capa da home e o capítulo da bandeira. Usa o Edge instalado (ou PW_EXECUTABLE_PATH).
// Uso: node scripts/qa/campeao-prints.mjs [http://localhost:3001] [pasta=docs/antonelli/prints] [--gif]
// --gif: grava também quadros da rolagem inteira (desktop e celular) em <pasta>/quadros-*/ para montar o GIF
//        (scripts/qa/campeao-gif.mjs).
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const gif = process.argv.includes("--gif");
const base = args[0]?.startsWith("http") ? args.shift() : "http://localhost:3001";
const out = args[0] ?? "docs/antonelli/prints";
fs.mkdirSync(out, { recursive: true });

const P = [0, 0.08, 0.2, 0.34, 0.46, 0.57, 0.6, 0.66, 0.9];
const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-2560", width: 2560, height: 1440 },
  { name: "celular-390", width: 390, height: 844, mobile: true },
];

const browser = await chromium.launch({ channel: "msedge", ...(process.env.PW_EXECUTABLE_PATH ? { channel: undefined, executablePath: process.env.PW_EXECUTABLE_PATH } : {}) });

async function scrollToP(page, p) {
  await page.evaluate((value) => {
    const section = document.querySelector(".campeao-cena");
    const top = section.getBoundingClientRect().top + window.scrollY;
    const total = section.offsetHeight - window.innerHeight;
    window.scrollTo(0, Math.round(top + total * value));
  }, p);
}

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(base + "/campeao", { waitUntil: "networkidle" });
  await page.waitForSelector(".campeao-fixo[data-ready]", { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  for (const p of P) {
    // Vem de p = 0 para p: o encaixe (p ≥ 0,58) dispara ao cruzar, como na rolagem real.
    await scrollToP(page, Math.max(0, p - 0.02));
    await page.waitForTimeout(120);
    await scrollToP(page, p);
    // p = 0,60: no meio da varredura do brilho (começa 0,1 s depois do encaixe e dura 1,7 s). Demais: tudo assentado.
    await page.waitForTimeout(p === 0.6 ? 1000 : p >= 0.58 ? 1900 : 400);
    await page.screenshot({ path: path.join(out, `${vp.name}-p${String(p).replace(".", "")}.png`) });
  }
  // Bandeira (capítulo 2) e coleção.
  await page.evaluate(() => document.querySelector("#bandeira").scrollIntoView({ block: "start" }));
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(out, `${vp.name}-bandeira.png`) });
  await page.evaluate(() => document.querySelector("#colecao").scrollIntoView({ block: "start" }));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, `${vp.name}-colecao.png`) });
  // Volta (rolagem para cima): o encaixe se desfaz.
  await scrollToP(page, 0.3);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, `${vp.name}-volta-p03.png`) });

  if (gif) {
    const dir = path.join(out, `quadros-${vp.name}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    await scrollToP(page, 0);
    await page.waitForTimeout(400);
    const frames = 64;
    for (let i = 0; i <= frames; i++) {
      await scrollToP(page, i / frames);
      await page.waitForTimeout(i / frames >= 0.58 && i / frames < 0.7 ? 220 : 90);
      await page.screenshot({ path: path.join(dir, `${String(i).padStart(3, "0")}.png`), scale: "css" });
    }
  }

  // Capa da home.
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const cover = page.locator(".campeao-capa");
  if (await cover.count()) {
    await cover.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.querySelector(".campeao-capa").scrollIntoView({ block: "start" }));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, `${vp.name}-home-capa.png`) });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, `${vp.name}-home-topo.png`) });
  console.log(`${vp.name}: scroll horizontal ${overflow}px · erros ${errors.length ? errors.join(" | ") : "nenhum"}`);
  await context.close();
}
await browser.close();
