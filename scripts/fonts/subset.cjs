/* eslint-disable @typescript-eslint/no-require-imports -- script Node em CommonJS, roda fora do app */
// Gera as fontes enxutas de app/fonts/ a partir das variáveis originais do Google Fonts (SIL OFL).
// Uso (fora do projeto, para não instalar dependência):
//   npm i --no-save subset-font@2
//   curl -L -o Archivo-var.ttf "https://github.com/google/fonts/raw/main/ofl/archivo/Archivo%5Bwdth,wght%5D.ttf"
//   curl -L -o Geist-var.ttf   "https://github.com/google/fonts/raw/main/ofl/geist/Geist%5Bwght%5D.ttf"
//   node scripts/fonts/subset.cjs <pasta-com-os-ttf>
// O que faz: subconjunto de glifos (ASCII + acentos do português + sinais usados no site) e limite dos eixos variáveis
// ao que o site usa (Archivo: largura 106–125, peso 300–900; Geist: peso 400–700). Archivo 88 KB → ~45 KB; Geist 29 → 18 KB.
// Se um texto novo usar um caractere fora da lista, ele cai na fonte de fallback: acrescente-o em EXTRA e gere de novo.
const path = require("path");
const fs = require("fs");
const subsetFont = require("subset-font");
const dir = process.argv[2] || ".";
const out = path.join(__dirname, "..", "..", "app", "fonts");
const EXTRA = "ÀÁÂÃÄÇÈÉÊÍÎÓÔÕÖÚÜàáâãäçèéêíîóôõöúüñÑ ªº°·–—‘’“”•…→←↗×€£";
let text = "";
for (let c = 0x20; c <= 0x7e; c++) text += String.fromCharCode(c);
text += EXTRA;
(async () => {
  const jobs = [
    ["Archivo-var.ttf", "archivo-wdth106-125-wght300-900.woff2", { wdth: { min: 106, max: 125 }, wght: { min: 300, max: 900 } }],
    ["Geist-var.ttf", "geist-wght400-700.woff2", { wght: { min: 400, max: 700 } }],
  ];
  for (const [src, dest, axes] of jobs) {
    const buf = await subsetFont(fs.readFileSync(path.join(dir, src)), text, { targetFormat: "woff2", variationAxes: axes });
    fs.writeFileSync(path.join(out, dest), buf);
    console.log(dest, Math.round(buf.length / 1024) + " KB");
  }
})();
