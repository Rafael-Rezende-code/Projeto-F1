// Marcadores provisórios no site (lançamento, item 4): percorre todas as páginas a partir de "/" (links internos, sem
// parâmetros) e lista o texto VISÍVEL entre colchetes em MAIÚSCULAS, como "[CONTEÚDO A SER REDIGIDO]" e "[CONFIRMAR]".
// Uso (com o build de produção rodando): node scripts/qa/marcadores.mjs [http://localhost:3001]
// Saída: uma linha por página com os marcadores e quantas vezes aparecem; código 1 se encontrar algum.
const BASE = (process.argv[2] ?? "http://localhost:3001").replace(/\/$/, "");
const MAX_PAGES = 500;
const MARKER = /\[[A-ZÀ-Ý0-9][A-ZÀ-Ý0-9 ,.\-/–]{3,}\]/g;

const visibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'");

const queue = ["/"];
const seen = new Set(queue);
const found = [];
while (queue.length && seen.size <= MAX_PAGES) {
  const path = queue.shift();
  let html;
  try {
    const response = await fetch(BASE + path, { redirect: "follow" });
    if (!(response.headers.get("content-type") ?? "").includes("text/html")) continue;
    html = await response.text();
  } catch (error) {
    console.error(`falhou ${path}: ${error.message}`);
    continue;
  }
  for (const [, href] of html.matchAll(/href="([^"#?]+)"/g)) {
    if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/_next") || href.startsWith("/admin") || /\.\w{2,4}$/.test(href)) continue;
    if (!seen.has(href)) {
      seen.add(href);
      queue.push(href);
    }
  }
  const counts = {};
  for (const [marker] of visibleText(html).matchAll(MARKER)) counts[marker] = (counts[marker] ?? 0) + 1;
  if (Object.keys(counts).length) found.push({ path, counts });
}

found.sort((a, b) => a.path.localeCompare(b.path));
for (const { path, counts } of found) console.log(`${path}\t${Object.entries(counts).map(([marker, count]) => `${marker} ×${count}`).join(" · ")}`);
console.log(`\n${seen.size} páginas visitadas; ${found.length} com marcadores provisórios.`);
process.exit(found.length ? 1 : 0);
