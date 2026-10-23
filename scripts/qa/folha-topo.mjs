// Folha de contato antes/depois do topo dos pilotos (docs/pilotos-topo). Uso: node scripts/qa/folha-topo.mjs
import sharp from "sharp";
import fs from "node:fs";

const slugs = ["norris", "verstappen", "hamilton", "bortoleto"];
const dir = "docs/pilotos-topo";

async function sheet(width, name) {
  const cell = 520;
  const rows = [];
  for (const set of ["antes", "depois"]) {
    const bufs = [];
    for (const slug of slugs) {
      const file = `${dir}/${set}/${slug}-${width}.jpg`;
      if (!fs.existsSync(file)) continue;
      bufs.push(await sharp(file).resize({ width: cell }).toBuffer());
    }
    rows.push(bufs);
  }
  const metas = await Promise.all(rows.map((r) => Promise.all(r.map((b) => sharp(b).metadata()))));
  const rowH = metas.map((r) => Math.max(...r.map((m) => m.height)));
  const gap = 8;
  const W = slugs.length * cell + (slugs.length + 1) * gap;
  const H = rowH.reduce((a, b) => a + b, 0) + gap * 3;
  const comps = [];
  let y = gap;
  rows.forEach((r, i) => { r.forEach((b, j) => comps.push({ input: b, left: gap + j * (cell + gap), top: y })); y += rowH[i] + gap; });
  await sharp({ create: { width: W, height: H, channels: 3, background: "#ffffff" } }).composite(comps).jpeg({ quality: 85 }).toFile(`${dir}/${name}`);
}

await sheet(1280, "antes-depois-1280x720.jpg");
await sheet(1024, "antes-depois-1024x768.jpg");
await sheet(1440, "antes-depois-1440x900.jpg");
console.log("folhas geradas em", dir);
