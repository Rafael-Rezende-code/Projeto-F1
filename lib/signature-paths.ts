import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, type Font } from "opentype.js";

// Contornos das assinaturas dos pilotos, gerados no SERVIDOR (as páginas /pilotos/[slug] são estáticas: roda no build).
// O cliente recebe só os paths SVG prontos: nem o opentype.js nem o arquivo da fonte vão para o navegador.
// Fonte: Great Vibes (SIL OFL), manuscrita GENÉRICA, subconjunto latino em assets/fonts/ (fora do public/).
// REGRA FIXA: nunca imitar o autógrafo real de um piloto (ver CLAUDE.md).
//
// Espaço entre palavras: o espaço da Great Vibes é estreito (0,17 em) e as laçadas de fim e de início de palavra invadem
// o vão ("GabrielBortoleto"). Cada palavra é posicionada pela TINTA: começa WORD_GAP depois do fim do traço da anterior,
// o vão natural de uma palavra escrita à mão.
// opentype.js fixado em 1.3.4: a partir da 1.3.5, toPathData(3) espera um objeto e as coordenadas viram NaN.

export const SIGNATURE_FONT_SIZE = 100; // unidades do viewBox (1em do texto = 100)
const WORD_GAP = 0.32 * SIGNATURE_FONT_SIZE;
const PAD = 0.15 * SIGNATURE_FONT_SIZE; // metade do traço da máscara (0,22 em / 2) + margem: nada encosta na borda

export type SignatureBox = { x: number; y: number; width: number; height: number };
export type SignatureData = { paths: string[]; box: SignatureBox };

let font: Font | null = null;
function loadFont() {
  if (!font) {
    const buf = readFileSync(join(process.cwd(), "assets", "fonts", "greatvibes-latin.woff"));
    font = parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  return font;
}

type Glyph = { x: number; glyph: ReturnType<Font["charToGlyph"]> };

export function signaturePaths(text: string): SignatureData {
  const f = loadFont();
  const size = SIGNATURE_FONT_SIZE;
  const baseline = size;
  const paths: string[] = [];
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  let cursor = 0; // onde a próxima palavra pode começar a tinta
  let first = true;

  for (const word of text.split(/\s+/).filter(Boolean)) {
    // Glifos da palavra com kerning, a partir de x = 0.
    const glyphs: Glyph[] = [];
    f.forEachGlyph(word, 0, baseline, size, { kerning: true }, (glyph, gx) => glyphs.push({ x: gx, glyph }));
    let left = Infinity, right = -Infinity;
    for (const { x, glyph } of glyphs) {
      const b = glyph.getPath(x, baseline, size).getBoundingBox();
      if (b.x2 > b.x1) { left = Math.min(left, b.x1); right = Math.max(right, b.x2); }
    }
    if (!Number.isFinite(left)) continue;
    const shift = first ? -left : cursor + WORD_GAP - left;
    first = false;
    for (const { x, glyph } of glyphs) {
      const path = glyph.getPath(x + shift, baseline, size);
      const d = path.toPathData(3);
      if (!d) continue;
      paths.push(d);
      const b = path.getBoundingBox();
      if (b.x2 > b.x1) { x1 = Math.min(x1, b.x1); y1 = Math.min(y1, b.y1); x2 = Math.max(x2, b.x2); y2 = Math.max(y2, b.y2); }
    }
    cursor = right + shift;
  }

  const box = Number.isFinite(x1)
    ? { x: x1 - PAD, y: y1 - PAD, width: x2 - x1 + PAD * 2, height: y2 - y1 + PAD * 2 }
    : { x: 0, y: 0, width: 0, height: 0 };
  return { paths, box };
}
