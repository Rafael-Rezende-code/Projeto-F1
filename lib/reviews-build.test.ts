import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// O bloco "EXEMPLO DE LAYOUT" das avaliações (components/reviews-example.tsx) só pode existir no ambiente de
// desenvolvimento. Este teste procura o marcador no BUILD DE PRODUÇÃO (.next, sem o cache e sem a pasta do dev server):
// páginas geradas, RSC e JavaScript do navegador. Sem build (só `pnpm test`), é pulado; o QA final roda depois do build.
const root = path.resolve(import.meta.dirname, "..");
const next = path.join(root, ".next");
const hasBuild = existsSync(path.join(next, "BUILD_ID"));
const MARKER = "EXEMPLO DE LAYOUT";

function* files(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (dir === next && (entry === "cache" || entry === "dev")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* files(full);
    else if (/\.(html|rsc|js|json|txt|body|meta)$/.test(entry)) yield full;
  }
}

describe("avaliações: nada de exemplo no build de produção", () => {
  it.skipIf(!hasBuild)("o marcador do bloco de exemplo não aparece em nenhum arquivo do .next", () => {
    const found: string[] = [];
    for (const file of files(next)) if (readFileSync(file, "utf8").includes(MARKER)) found.push(path.relative(root, file));
    expect(found).toEqual([]);
  });
});
