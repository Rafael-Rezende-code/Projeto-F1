// Gera os placeholders desfocados (next/image placeholder="blur") de TODAS as fotos locais em public/images.
// Roda sozinho antes do build (`prebuild` no package.json) e à mão com `pnpm images:blur` depois de trocar uma foto.
// Saída: lib/generated/blur-placeholders.json ({ "/images/...": { w, h, blur } }), lido por lib/local-images.ts.
// `blur` é a foto reduzida a 16px de largura em WebP (~150–300 bytes): o navegador amplia e desfoca. `w`/`h` são as
// dimensões reais do arquivo (servem para saber, no build, se existe uma versão opcional e qual a orientação dela).
// Logos (public/images/logos-equipes) ficam de fora: são <img> pequenas e monocromáticas, sem placeholder.
import { readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(ROOT, "lib/generated/blur-placeholders.json");
const SKIP = [path.join(PUBLIC, "images/logos-equipes")];

async function walk(dir) {
  if (SKIP.some((skip) => dir.startsWith(skip))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(jpe?g|png|webp|avif)$/i.test(entry.name) ? [full] : [];
  }));
  return nested.flat();
}

const files = (await walk(path.join(PUBLIC, "images"))).sort();
const result = {};
for (const file of files) {
  const image = sharp(file).rotate();
  const { width, height, orientation } = await image.metadata();
  const [w, h] = orientation && orientation >= 5 ? [height, width] : [width, height];
  const buffer = await image.resize(16).webp({ quality: 50 }).toBuffer();
  result["/" + path.relative(PUBLIC, file).split(path.sep).join("/")] = { w, h, blur: `data:image/webp;base64,${buffer.toString("base64")}` };
}
await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(result, null, 2) + "\n");
console.log(`blur-placeholders: ${files.length} imagens → ${path.relative(ROOT, OUT)}`);
