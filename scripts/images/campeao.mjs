// Sessão do Campeão: derivados das imagens fornecidas (public/images/campeao/, ORIGINAIS NÃO SÃO ALTERADOS).
// Uso: node scripts/images/campeao.mjs   (depois: pnpm images:blur)
// Gera em public/images/campeao/derivados/:
//  - rosto-{w}.avif|webp, bandeira-{w}.avif|webp, bandeira-vertical-{w}.avif|webp (sem alfa)
//  - coroa-{w}.avif|webp (COM alfa: a camada coroa + mãos é recortada)
//  - mascara-ouro.webp: máscara do brilho dourado (só o metal da coroa), porta de docs/referencia/coroacao/mask_ouro.py
//    com a região 0.295 0.707 0.12 0.68. Se a camada da coroa mudar, rode de novo e confira a prévia
//    docs/antonelli/mascara-previa.png (só o ouro pode aparecer marcado).
//  - composicao-final.jpg: rosto + coroa (com o esmaecimento das pontas dos braços) achatados, sem texto, base da imagem
//    de compartilhamento (app/campeao/opengraph-image.tsx e a do piloto).
// Larguras: 768, 1280 e a largura do original (1672 nas fotos 16:9, 1774 na coroa, 1170 na bandeira vertical). Não há
// 1920/2560: os originais têm 1672 px e ampliar só aumentaria o arquivo sem ganho de nitidez.
import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(ROOT, "public/images/campeao");
const OUT = path.join(SRC, "derivados");
await mkdir(OUT, { recursive: true });

const sources = [
  { name: "rosto", file: "fundo_rosto.png", widths: [768, 1280, 1672] },
  { name: "coroa", file: "camada_coroa.png", widths: [768, 1280, 1774], alpha: true },
  { name: "bandeira", file: "bandeira.png", widths: [768, 1280, 1672] },
  { name: "bandeira-vertical", file: "bandeira vertical.jpeg", widths: [768, 1170] },
];

const report = [];
for (const source of sources) {
  for (const width of source.widths) {
    const base = sharp(path.join(SRC, source.file)).resize({ width, withoutEnlargement: true });
    const avif = path.join(OUT, `${source.name}-${width}.avif`);
    const webp = path.join(OUT, `${source.name}-${width}.webp`);
    // AVIF/WebP com alfa quando a camada tem transparência (o sharp mantém o canal se existir).
    await base.clone().avif({ quality: source.alpha ? 62 : 58, effort: 6 }).toFile(avif);
    await base.clone().webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(webp);
    report.push(`${path.basename(avif)} ${((await stat(avif)).size / 1024).toFixed(0)} KB · ${path.basename(webp)} ${((await stat(webp)).size / 1024).toFixed(0)} KB`);
  }
}

// ---- Máscara do ouro (porta fiel do mask_ouro.py) ----
const REGION = [0.295, 0.707, 0.12, 0.68];
const { data: rgb, info } = await sharp(path.join(SRC, "camada_coroa.png")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const m = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const v = max / 255;
    const s = max === 0 ? 0 : (max - min) / max;
    let h = 0; // graus, como o HSV do PIL (0–255 convertido para 0–360)
    if (max !== min) {
      const d = max - min;
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const ouro = h > 18 && h < 52 && s > 0.32 && v > 0.42;
    const regiao = x > REGION[0] * W && x < REGION[1] * W && y > REGION[2] * H && y < REGION[3] * H;
    m[i] = ouro && regiao ? Math.min(1, Math.max(0.25, (v - 0.35) / 0.5)) : 0;
  }
}
// MaxFilter(3)
let a = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) a[i] = Math.floor(m[i] * 255);
const dil = new Uint8Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let best = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < H && xx >= 0 && xx < W) best = Math.max(best, a[yy * W + xx]);
    }
    dil[y * W + x] = best;
  }
}
// Remove só os pontinhos isolados de baixo (área < 220 e centro abaixo de 66% da altura): componentes 8-conexos.
const label = new Int32Array(W * H);
let next = 0;
const stack = [];
for (let start = 0; start < W * H; start++) {
  if (dil[start] <= 60 || label[start]) continue;
  next++;
  const pixels = [];
  label[start] = next;
  stack.push(start);
  while (stack.length) {
    const p = stack.pop();
    pixels.push(p);
    const px = p % W, py = (p - px) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = px + dx, yy = py + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const q = yy * W + xx;
      if (dil[q] > 60 && !label[q]) { label[q] = next; stack.push(q); }
    }
  }
  const cy = pixels.reduce((sum, p) => sum + Math.floor(p / W), 0) / pixels.length;
  if (pixels.length < 220 && cy > 0.66 * H) for (const p of pixels) dil[p] = 0;
}
const alpha = await sharp(Buffer.from(dil), { raw: { width: W, height: H, channels: 1 } }).blur(1.4).extractChannel(0).raw().toBuffer();
if (alpha.length !== W * H) throw new Error(`máscara com tamanho inesperado: ${alpha.length}`);
let covered = 0;
for (const value of alpha) if (value > 40) covered++;
const rgba = Buffer.alloc(W * H * 4, 255);
for (let i = 0; i < W * H; i++) rgba[i * 4 + 3] = alpha[i];
// Máscara final em WebP com alfa (o brilho é desfocado: perda no alfa não aparece). Mesma proporção da camada.
const maskFile = path.join(OUT, "mascara-ouro.webp");
await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 60, alphaQuality: 70, effort: 6 }).toFile(maskFile);
report.push(`mascara-ouro.webp ${((await stat(maskFile)).size / 1024).toFixed(0)} KB · cobertura ${(100 * covered / (W * H)).toFixed(1)}% da camada`);
// Prévia para conferência: a máscara em magenta sobre a camada.
await mkdir(path.join(ROOT, "docs/antonelli"), { recursive: true });
const tint = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { tint[i * 4] = 255; tint[i * 4 + 1] = 0; tint[i * 4 + 2] = 255; tint[i * 4 + 3] = alpha[i]; }
await sharp(path.join(SRC, "camada_coroa.png")).flatten({ background: "#e4dfdc" })
  .composite([{ input: tint, raw: { width: W, height: H, channels: 4 } }])
  .png().toBuffer().then((buffer) => sharp(buffer).resize(1000).png().toFile(path.join(ROOT, "docs/antonelli/mascara-previa.png")));

// ---- Composição final achatada (sem texto) ----
const face = sharp(path.join(SRC, "fundo_rosto.png"));
const { width: FW, height: FH } = await face.metadata();
const crownW = Math.round(FW * 0.8074);
const crown = await sharp(path.join(SRC, "camada_coroa.png")).resize(crownW).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// Esmaecimento horizontal das pontas dos braços: transparente → opaco de 14% a 86% → transparente.
const cw = crown.info.width, ch = crown.info.height;
for (let x = 0; x < cw; x++) {
  const t = x / (cw - 1);
  const f = t < 0.14 ? t / 0.14 : t > 0.86 ? (1 - t) / 0.14 : 1;
  for (let y = 0; y < ch; y++) crown.data[(y * cw + x) * 4 + 3] = Math.round(crown.data[(y * cw + x) * 4 + 3] * f);
}
const crownPng = await sharp(crown.data, { raw: { width: cw, height: ch, channels: 4 } }).png().toBuffer();
await face.composite([{ input: crownPng, left: Math.round(FW * 0.0999), top: Math.round(FH * 0.2306) }])
  .jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(OUT, "composicao-final.jpg"));
report.push(`composicao-final.jpg ${((await stat(path.join(OUT, "composicao-final.jpg"))).size / 1024).toFixed(0)} KB`);

await writeFile(path.join(OUT, "LEIA-ME.txt"), "Gerado por scripts/images/campeao.mjs a partir dos originais da pasta de cima (não editar à mão).\n");
console.log(report.join("\n"));
