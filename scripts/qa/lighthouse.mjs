// Lighthouse mobile (perfil padrão: 4G lenta simulada + CPU 4×), N execuções por rota; imprime cada uma e a mediana.
// Uso: node scripts/qa/lighthouse.mjs [http://localhost:3001] [3] /rota1 /rota2 ...
// Precisa do build de produção rodando (next start) e do Lighthouse via npx (lighthouse@12.8.2). Usa o Edge instalado
// (ou CHROME_PATH). Sem dev server ligado: recompilação derruba a nota.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const base = args[0]?.startsWith("http") ? args.shift() : "http://localhost:3001";
const runs = /^\d+$/.test(args[0] ?? "") ? Number(args.shift()) : 3;
const routes = args.length ? args : ["/"];
// O chrome-launcher só aceita o navegador pela variável CHROME_PATH (a opção --chrome-path é ignorada no Windows).
const chrome = process.env.CHROME_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lh-"));
const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];

for (const route of routes) {
  const scores = [];
  const lcp = [];
  const tbt = [];
  let other = null;
  for (let i = 0; i < runs; i++) {
    const file = path.join(tmp, `r${i}.json`);
    execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["-y", "lighthouse@12.8.2", base + route, "--quiet", "--output=json", `--output-path=${file}`, "--chrome-flags=--headless=new", "--only-categories=performance,accessibility,best-practices,seo"],
      { stdio: "ignore", shell: process.platform === "win32", env: { ...process.env, CHROME_PATH: chrome } },
    );
    const report = JSON.parse(fs.readFileSync(file, "utf8"));
    scores.push(Math.round(report.categories.performance.score * 100));
    lcp.push(report.audits["largest-contentful-paint"].numericValue);
    tbt.push(report.audits["total-blocking-time"].numericValue);
    other = ["accessibility", "best-practices", "seo"].map((key) => Math.round(report.categories[key].score * 100)).join("/");
  }
  console.log(`${route}  desempenho ${scores.join("/")} (mediana ${median(scores)})  LCP ${(median(lcp) / 1000).toFixed(2)} s  TBT ${Math.round(median(tbt))} ms  a11y/boas/SEO ${other}`);
}
