// Monta, a partir dos prints de scripts/qa/campeao-prints.mjs (--gif): os GIFs da rolagem inteira (desktop e celular),
// as folhas de contato nos 9 pontos de p e a comparação de tipografia com docs/referencia/coroacao/original.png.
// Uso: node scripts/qa/campeao-gif.mjs [pasta=docs/antonelli/prints]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dir = process.argv[2] ?? "docs/antonelli/prints";
const P = ["0", "008", "02", "034", "046", "057", "06", "066", "09"];

for (const [name, width] of [["desktop-1440", 720], ["celular-390", 300]]) {
  const framesDir = path.join(dir, `quadros-${name}`);
  if (fs.existsSync(framesDir)) {
    const files = fs.readdirSync(framesDir).filter((file) => file.endsWith(".jpg")).sort();
    const frames = await Promise.all(files.map((file) => sharp(path.join(framesDir, file)).resize({ width }).png().toBuffer()));
    // Ida e volta (a cena é reversível), 80 ms por quadro, pausa no fim.
    const sequence = [...frames, ...Array(8).fill(frames.at(-1)), ...[...frames].reverse()];
    await sharp(sequence, { join: { animated: true } }).gif({ delay: sequence.map(() => 80), loop: 0, effort: 7 }).toFile(path.join(dir, `coroacao-${name}.gif`));
    fs.rmSync(framesDir, { recursive: true, force: true });
    console.log(`coroacao-${name}.gif (${sequence.length} quadros)`);
  }
  // Folha: os 9 pontos de p, com rótulo.
  const mobile = name.startsWith("celular");
  const w = mobile ? 260 : 480;
  const h = mobile ? 563 : 300;
  const cols = mobile ? 9 : 3;
  const tiles = await Promise.all(P.map(async (p, i) => {
    const label = Buffer.from(`<svg width="${w}" height="26"><rect width="${w}" height="26" fill="#0d0d0d"/><text x="10" y="18" font-family="Arial" font-size="14" fill="#fff">p = ${["0", ".08", ".2", ".34", ".46", ".57", ".60 (brilho)", ".66", ".9"][i]}</text></svg>`);
    return sharp(path.join(dir, `${name}-p${p}.jpg`)).resize(w, h).composite([{ input: label, top: 0, left: 0 }]).toBuffer();
  }));
  const rows = Math.ceil(P.length / cols);
  await sharp({ create: { width: w * cols, height: h * rows, channels: 3, background: "#fff" } })
    .composite(tiles.map((tile, i) => ({ input: tile, left: (i % cols) * w, top: Math.floor(i / cols) * h })))
    .jpeg({ quality: 82 }).toFile(path.join(dir, `folha-${name}.jpg`));
  console.log(`folha-${name}.jpg`);
}

// Tipografia: o título do protótipo aprovado (original.png, 1672 px) × o nosso em p = .9 no desktop 2560 (palco 2560 px),
// no mesmo tamanho (palco reduzido para 1672 px) e mesmo recorte.
const ours = await sharp(path.join(dir, "desktop-2560-p09.jpg")).resize(1672).toBuffer();
const crop = { left: 520, top: 30, width: 632, height: 240 };
const a = await sharp("public/images/campeao/Kimi e a coroa dourada.png") /* = original.png */.extract(crop).toBuffer();
const b = await sharp(ours).extract({ ...crop, top: crop.top + Math.round((await sharp(ours).metadata()).height - 941) / 2 }).toBuffer();
const lab = (text) => Buffer.from(`<svg width="632" height="30"><rect width="632" height="30" fill="#0d0d0d"/><text x="10" y="20" font-family="Arial" font-size="15" fill="#fff">${text}</text></svg>`);
await sharp({ create: { width: 632 * 2 + 12, height: 270, channels: 3, background: "#fff" } })
  .composite([
    { input: lab("original.png (aprovada)"), left: 0, top: 0 }, { input: a, left: 0, top: 30 },
    { input: lab("site: Inter 500 + JetBrains Mono 500 (p = .9)"), left: 644, top: 0 }, { input: b, left: 644, top: 30 },
  ])
  .png().toFile(path.join(dir, "tipografia-original-x-site.png"));
console.log("tipografia-original-x-site.png");
