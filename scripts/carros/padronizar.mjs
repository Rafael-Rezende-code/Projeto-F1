// Padroniza os carros do topo da página do piloto (feat/carros).
//
// Entrada: PNGs JÁ recortados (fundo transparente) em assets/carros-brutos/enviados-2026-10-22/ (fora do deploy), um por
// piloto. Para fotos com fundo, use antes o scripts/carros/recortar.py (rembg).
// Saída, em public/images/pilotos/carros/:
//   {slug}.png          trim justo (sem margem transparente), MESMA ALTURA em pixels nos quatro e escala só para baixo;
//                       a base do arquivo é a base do pneu mais baixo: todos têm a mesma linha do chão.
//   {slug}-motion.webp       rastro FORTE de movimento (blur horizontal só do lado de trás, pequeno: 640px) e
//   {slug}-motion-soft.webp  rastro LEVE: o "motion blur falso" da entrada (components/driver-car.tsx) passa do forte para o
//                            leve enquanto o carro desacelera e do leve para a imagem nítida no último terço. Os dois
//                            têm margem extra do lado do rastro (GHOST_PAD).
// Também grava prévias em docs/carros/previas/ (sobre fundo branco e na cor da equipe) e imprime os números que vão para
// lib/drivers.ts (largura/altura e GHOST_PAD). Uso: node scripts/carros/padronizar.mjs
//
// carFacing (lado para onde o carro aponta NO ARQUIVO): norris, hamilton e bortoleto "right"; verstappen "left". A página
// NÃO espelha (espelhar inverteria os textos dos patrocinadores): o lado decide de onde o carro entra. Mantenha igual em
// lib/drivers.ts.
// PLACEHOLDERS: as fotos têm logos de patrocinadores e números (alguns de outros pilotos). Ver CLAUDE.md.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RAW = path.join(ROOT, "assets", "carros-brutos", "enviados-2026-10-22");
const OUT = path.join(ROOT, "public", "images", "pilotos", "carros");
const PREVIEWS = path.join(ROOT, "docs", "carros", "previas");

const CARS = [
  { slug: "norris", file: "norris-mclaren.png", facing: "right", color: "#E77400" },
  { slug: "verstappen", file: "verstappen-redbull.png", facing: "left", color: "#1B2A5C" },
  { slug: "hamilton", file: "hamilton-ferrari.png", facing: "right", color: "#DC0000" },
  { slug: "bortoleto", file: "bortoleto-audi.png", facing: "right", color: "#BB0A30" },
];

const ALPHA_MIN = 24; // pixel "do carro": alfa a partir daqui (ignora o halo quase transparente)
const MIN_PIXELS = 4; // linha/coluna só conta com pelo menos N pixels do carro (ignora respingos soltos)
const GHOST_WIDTH = 640; // largura do rastro (px): blur não precisa de resolução
const GHOST_SMEAR = 0.09; // comprimento do rastro forte (fração da largura do carro)
const GHOST_SMEAR_SOFT = 0.035; // comprimento do rastro leve
const GHOST_PAD = 0.12; // margem transparente extra do lado do rastro (fração da largura do carro)

async function readRgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Caixa justa do carro pelo alfa (com tolerância a respingos). */
function bbox({ data, width, height }) {
  const rows = new Uint32Array(height);
  const cols = new Uint32Array(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] >= ALPHA_MIN) {
        rows[y]++;
        cols[x]++;
      }
    }
  }
  const first = (arr) => arr.findIndex((n) => n >= MIN_PIXELS);
  const last = (arr) => arr.length - 1 - [...arr].reverse().findIndex((n) => n >= MIN_PIXELS);
  const left = first(cols);
  const top = first(rows);
  return { left, top, width: last(cols) - left + 1, height: last(rows) - top + 1 };
}

/**
 * Blur de movimento horizontal em alfa pré-multiplicado: cada pixel recebe a média da janela [x, x+L] (movimento para a
 * direita: o rastro fica atrás, à esquerda do carro) ou [x-L, x] (movimento para a esquerda).
 */
function smear(rgba, width, height, length, facing) {
  const out = Buffer.alloc(rgba.length);
  const pre = new Float32Array(width * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = rgba[i + 3] / 255;
      pre[x * 4] = rgba[i] * a;
      pre[x * 4 + 1] = rgba[i + 1] * a;
      pre[x * 4 + 2] = rgba[i + 2] * a;
      pre[x * 4 + 3] = a;
    }
    for (let x = 0; x < width; x++) {
      const from = facing === "right" ? x : x - length;
      const to = facing === "right" ? x + length : x;
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let k = Math.max(0, from); k <= Math.min(width - 1, to); k++) {
        r += pre[k * 4]; g += pre[k * 4 + 1]; b += pre[k * 4 + 2]; a += pre[k * 4 + 3];
      }
      n = to - from + 1; // fora da imagem conta como transparente
      const i = (y * width + x) * 4;
      const alpha = a / n;
      out[i + 3] = Math.round(alpha * 255);
      if (alpha > 0.002) {
        out[i] = Math.min(255, Math.round(r / n / alpha));
        out[i + 1] = Math.min(255, Math.round(g / n / alpha));
        out[i + 2] = Math.min(255, Math.round(b / n / alpha));
      }
    }
  }
  return out;
}

await mkdir(OUT, { recursive: true });
await mkdir(PREVIEWS, { recursive: true });

const sources = [];
for (const car of CARS) {
  const raw = await readRgba(path.join(RAW, car.file));
  const box = bbox(raw);
  sources.push({ car, box, raw });
}
// Mesma altura nos quatro: a menor altura nativa (nenhum é ampliado).
const targetHeight = Math.min(...sources.map((s) => s.box.height));

const report = [];
const previews = [];
for (const { car, box, raw } of sources) {
  const trimmed = sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } }).extract({
    left: box.left, top: box.top, width: box.width, height: box.height,
  });
  const width = Math.round((box.width * targetHeight) / box.height);
  const png = await trimmed.clone().resize({ width, height: targetHeight, kernel: "lanczos3" }).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  await writeFile(path.join(OUT, `${car.slug}.png`), png);

  // Rastro: carro reduzido + margem do lado do rastro + blur direcional.
  const gw = GHOST_WIDTH;
  const gh = Math.round((targetHeight * gw) / width);
  const small = await sharp(png).resize({ width: gw, height: gh, kernel: "lanczos3" }).ensureAlpha().raw().toBuffer();
  const pad = Math.round(gw * GHOST_PAD);
  const padded = Buffer.alloc((gw + pad) * gh * 4);
  for (let y = 0; y < gh; y++) {
    small.copy(padded, (y * (gw + pad) + (car.facing === "right" ? pad : 0)) * 4, y * gw * 4, (y + 1) * gw * 4);
  }
  const ghostFile = async (suffix, smearFraction) => {
    const blurred = smear(padded, gw + pad, gh, Math.round(gw * smearFraction), car.facing);
    const out = await sharp(blurred, { raw: { width: gw + pad, height: gh, channels: 4 } }).webp({ quality: 78, alphaQuality: 90 }).toBuffer();
    await writeFile(path.join(OUT, `${car.slug}${suffix}.webp`), out);
    return out;
  };
  const ghost = await ghostFile("-motion", GHOST_SMEAR);
  await ghostFile("-motion-soft", GHOST_SMEAR_SOFT);

  // Prévia: branco e cor da equipe, com a linha do chão desenhada.
  const prev = await sharp(png).resize({ width: 900 }).toBuffer();
  const meta = await sharp(prev).metadata();
  for (const [name, bg] of [["branco", "#ffffff"], ["equipe", car.color]]) {
    const base = await sharp({ create: { width: 940, height: meta.height + 40, channels: 3, background: bg } })
      .composite([
        { input: prev, left: 20, top: 20 },
        { input: Buffer.from(`<svg width="940" height="${meta.height + 40}"><line x1="0" x2="940" y1="${meta.height + 20}" y2="${meta.height + 20}" stroke="#00e5ff" stroke-width="1"/></svg>`), left: 0, top: 0 },
      ])
      .jpeg({ quality: 88 })
      .toBuffer();
    await writeFile(path.join(PREVIEWS, `${car.slug}-${name}.jpg`), base);
    previews.push({ slug: car.slug, name, base });
  }
  report.push({ slug: car.slug, facing: car.facing, original: `${raw.width}x${raw.height}`, trim: `${box.width}x${box.height}`, saida: `${width}x${targetHeight}`, pngKB: Math.round(png.length / 1024), ghostKB: Math.round(ghost.length / 1024), ghost: `${gw + pad}x${gh}` });
}

console.table(report);
console.log(`altura comum: ${targetHeight}px; GHOST_PAD ${GHOST_PAD} (igual em components/driver-car.tsx)`);
