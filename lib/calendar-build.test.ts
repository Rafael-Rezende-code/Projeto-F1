import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// O calendário de EXEMPLO (lib/calendar-example.ts) só pode existir em desenvolvimento: a loja não inventa calendário.
// Procura o texto do exemplo no BUILD DE PRODUÇÃO (.next, sem cache e sem a pasta do dev server). Sem build, é pulado.
const root = path.resolve(import.meta.dirname, "..");
const next = path.join(root, ".next");
const hasBuild = existsSync(path.join(next, "BUILD_ID"));
const MARKER = "GP de Exemplo";

function* files(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (dir === next && (entry === "cache" || entry === "dev")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* files(full);
    else if (/\.(html|rsc|js|json|txt|body|meta)$/.test(entry)) yield full;
  }
}

describe("calendário: nada de exemplo no build de produção", () => {
  it.skipIf(!hasBuild)("o texto do calendário de exemplo não aparece em nenhum arquivo do .next", () => {
    const found: string[] = [];
    for (const file of files(next)) if (readFileSync(file, "utf8").includes(MARKER)) found.push(path.relative(root, file));
    expect(found).toEqual([]);
  }, 120_000);
});
