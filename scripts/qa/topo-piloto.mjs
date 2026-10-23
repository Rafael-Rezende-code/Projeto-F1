// Mede o topo da página do piloto (bloco colorido x coluna da foto) e tira prints.
// Uso: node scripts/qa/topo-piloto.mjs <pasta-de-saida> [http://localhost:3000]
// Saída: uma linha por piloto e largura com a altura do bloco, a da foto, a faixa que sobra embaixo/à direita e scroll horizontal.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2] ?? "docs/pilotos-topo/medicao";
const base = process.argv[3] ?? "http://localhost:3000";
const slugs = ["norris", "verstappen", "hamilton", "bortoleto"];
const sizes = [[1920, 1080], [1440, 900], [1280, 720], [1024, 768], [820, 1180], [390, 844]];
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
let bad = 0;
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
  const page = await ctx.newPage();
  for (const slug of slugs) {
    await page.goto(`${base}/pilotos/${slug}`, { waitUntil: "load" });
    await page.waitForTimeout(6500);
    const m = await page.evaluate(() => {
      const header = document.querySelector(".driver-header");
      const hb = header.getBoundingClientRect();
      const photo = [...header.children].find((c) => getComputedStyle(c).gridArea.startsWith("photo"));
      const pb = photo.getBoundingClientRect();
      const side = pb.left > hb.left + hb.width * 0.3; // foto ao lado do texto (coluna da direita)
      const doc = document.documentElement;
      return { header: Math.round(hb.height), photo: Math.round(pb.height), side, gapBottom: Math.round(hb.bottom - pb.bottom), gapRight: Math.round(hb.right - pb.right), hscroll: doc.scrollWidth > doc.clientWidth };
    });
    // Foto na coluna da direita: não pode sobrar faixa embaixo nem à direita. Foto abaixo do texto: não pode sobrar à direita.
    const fail = m.hscroll || m.gapRight > 1 || (m.side && m.gapBottom > 1);
    if (fail) bad++;
    console.log(`${w}x${h} ${slug.padEnd(10)} bloco ${m.header} foto ${m.photo} ${m.side ? "ao lado" : "abaixo"} sobra-baixo ${m.gapBottom} sobra-direita ${m.gapRight} hscroll ${m.hscroll} ${fail ? "FALHOU" : "ok"}`);
    await page.screenshot({ path: path.join(out, `${slug}-${w}.jpg`), type: "jpeg", quality: 82, clip: { x: 0, y: 0, width: w, height: Math.min(h, 1180) } });
  }
  await ctx.close();
}
await browser.close();
console.log(bad ? `${bad} caso(s) com faixa sobrando` : "Sem faixa sobrando.");
process.exit(bad ? 1 : 0);
