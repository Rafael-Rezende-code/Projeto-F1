// Gera public/images/lendas/linhas.svg (fundo gráfico das Lendas) a partir das linhas da VELOCIDADE (lib/velocidade-pattern.ts).
// Arquivo estático: uma vez no cache do navegador, em vez de ~40 KB de SVG no HTML de cada card.
// Uso: node node_modules/tsx/dist/cli.mjs scripts/images/linhas-lendas.mts
import { writeFileSync } from "node:fs";
import { PATTERN_BOX, PATTERN_PATHS } from "../../lib/velocidade-pattern";

const round = (d: string) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${PATTERN_BOX.x} ${PATTERN_BOX.y} ${PATTERN_BOX.width} ${PATTERN_BOX.height}" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#fff" stroke-width="1">${PATTERN_PATHS.map((d) => `<path d="${round(d)}" vector-effect="non-scaling-stroke"/>`).join("")}</g></svg>`;
writeFileSync("public/images/lendas/linhas.svg", svg);
console.log(`linhas.svg: ${(svg.length / 1024).toFixed(1)} KB`);
