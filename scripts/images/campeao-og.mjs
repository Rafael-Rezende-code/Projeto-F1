// Imagem de compartilhamento da Sessão do Campeão: achata a composição FINAL da Coroação (rosto + coroa + título
// "THE CHAMPION / Kimi" + selo), renderizada pelo próprio componente com as fontes reais, num JPG 1200×630.
// Uso (com o site rodando: dev ou build): node scripts/images/campeao-og.mjs [http://localhost:3001]
// Saída: public/images/campeao/derivados/og-campeao.jpg, usada por app/(loja)/campeao/opengraph-image.tsx (next/og) e
// pela página do piloto campeão (generateMetadata). Rode de novo se a composição mudar.
import { chromium } from "@playwright/test";
import path from "node:path";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3001";
const OUT = path.resolve(import.meta.dirname, "../../public/images/campeao/derivados/og-campeao.jpg");
const browser = await chromium.launch({ channel: "msedge", ...(process.env.PW_EXECUTABLE_PATH ? { channel: undefined, executablePath: process.env.PW_EXECUTABLE_PATH } : {}) });
// Palco 16:9 de 1200 px: 2× para a nitidez; depois recorta 1200×630 (tira só a faixa de baixo, abaixo dos olhos).
const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 2 });
await page.goto(base + "/campeao", { waitUntil: "networkidle" });
await page.addStyleTag({ content: "header, [data-dock], .whatsapp-fab, nextjs-portal { display: none !important; } .campeao-palco { -webkit-mask-image: none !important; mask-image: none !important; }" });
await page.waitForSelector(".campeao-fixo[data-ready]");
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => {
  const section = document.querySelector(".campeao-cena");
  window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY + section.offsetHeight - window.innerHeight);
});
await page.waitForTimeout(2600); // encaixe, varredura do brilho (1,8 s) e selo
const shot = await page.locator(".campeao-palco").screenshot({ animations: "disabled" });
await sharp(shot).resize(1200, 675).extract({ left: 0, top: 0, width: 1200, height: 630 }).jpeg({ quality: 86, mozjpeg: true }).toFile(OUT);
console.log("og-campeao.jpg →", path.relative(process.cwd(), OUT));
await browser.close();
