// Varredura de layout: scroll horizontal, elementos que vazam da tela, títulos cortados e erros de console.
// Uso (com o site rodando, ex.: build de produção em :3001):
//   corepack pnpm qa:varredura                       → http://localhost:3001, 5 larguras, rotas principais
//   node scripts/qa/varredura.mjs http://localhost:3000 1440,390 /,/produtos
// Usa o Playwright do projeto com o Edge instalado (channel "msedge"), como os testes e2e: não baixa navegador.
//
// Títulos cortados: mede SÓ o que aparece. A versão anterior media o texto inteiro do h1/h2 e acusava falsos cortes:
// o nome em texto "sr-only" da página do piloto (o visível é a assinatura em SVG) e o h2 de "Luzes apagadas." (o
// KineticText tem uma cópia acessível escondida). Agora: texto que aparece na tela (fora de sr-only, display:none e
// visibility:hidden e de painéis fechados [inert]; texto aria-hidden visível conta) + SVGs visíveis dentro do título.
import { chromium } from "@playwright/test";

const [BASE = "http://localhost:3001", WIDTHS = "1440,1280,820,390,360", ROUTES] = process.argv.slice(2);
const routes = (ROUTES || "/,/equipes,/equipes/williams,/pilotos/hamilton,/pilotos/bortoleto,/pilotos/norris,/produtos/scuderia-racing-jacket,/produtos/miniatura-capacete-hamilton,/produtos,/favoritos,/carrinho,/checkout,/diario,/diario/senna-e-a-mclaren,/diario/o-brasil-de-volta-ao-grid,/sobre,/contato,/admin,/nao-existe").split(",");

const check = () => {
  const cw = document.documentElement.clientWidth;
  const hidden = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === "none" || s.visibility === "hidden") return true;
      // painel fechado (gaveta da sacola, busca, menu): inert e fora da tela por transform
      if (p.inert) return true;
      // sr-only: 1px recortado
      if (s.position === "absolute" && p.offsetWidth <= 1 && p.offsetHeight <= 1) return true;
    }
    return false;
  };
  // Elementos que vazam para fora da largura (ignora fixos e o que está dentro de contêiner que corta overflow).
  const over = [...document.querySelectorAll("body *")].filter((e) => {
    const b = e.getBoundingClientRect();
    if (!b.width) return false;
    for (let p = e; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.position === "fixed") return false;
      if (p !== e && /(auto|scroll|hidden|clip)/.test(s.overflowX)) return false;
    }
    return b.right > cw + 1 || b.left < -1;
  }).slice(0, 3).map((e) => e.tagName + "." + String(e.className).slice(0, 50));
  // Títulos: caixas do texto visível e dos SVGs visíveis.
  const titles = [...document.querySelectorAll("h1,h2")].filter((h) => !hidden(h)).flatMap((h) => {
    const rects = [];
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim() || hidden(n.parentElement)) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      rects.push(...r.getClientRects());
    }
    for (const svg of h.querySelectorAll("svg")) {
      const s = getComputedStyle(svg);
      if (s.display !== "none" && s.visibility !== "hidden") rects.push(svg.getBoundingClientRect());
    }
    const cut = rects.some((r) => r.width && (r.left < 0 || r.right > cw));
    return cut ? ["TÍTULO: " + h.textContent.trim().slice(0, 40)] : [];
  });
  return { hscroll: document.documentElement.scrollWidth > cw, over, titles };
};

// PW_EXECUTABLE_PATH: Chromium no lugar do Edge (ex.: sessão em nuvem Linux), como no playwright.config.ts.
const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : { channel: "msedge" });
let problems = 0;
for (const w of WIDTHS.split(",").map(Number)) {
  const mobile = w < 768;
  const context = await browser.newContext({ viewport: { width: w, height: mobile ? 800 : 900 }, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  for (const route of routes) {
    const errors = [];
    page.removeAllListeners("console");
    // Ignorados (esperados): 404 do /_vercel/insights (só existe na Vercel) e o 404 do próprio documento numa rota inexistente.
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const where = msg.location().url || "";
      if (where.includes("/_vercel/") || (where === page.url() && msg.text().includes("404"))) return;
      errors.push(msg.text().slice(0, 160) + (where ? " (" + where.slice(-60) + ")" : ""));
    });
    page.removeAllListeners("pageerror");
    page.on("pageerror", (err) => errors.push("EXC " + String(err).slice(0, 160)));
    // Se a rede não acalma (ex.: o otimizador travar numa imagem), segue com o que já carregou em vez de derrubar a varredura.
    await page.goto(BASE + route, { waitUntil: "networkidle" }).catch(async () => { await page.waitForTimeout(1500); });
    // rola até o fim e volta (monta o que entra por IntersectionObserver)
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 600)); });
    const r = await page.evaluate(check);
    const bad = r.hscroll || r.over.length || r.titles.length || errors.length;
    if (bad) problems++;
    console.log(`${String(w).padEnd(5)} ${route.padEnd(38)} ${bad ? "!!" : "ok"} ${r.hscroll ? "SCROLL-HORIZONTAL " : ""}${r.over.length ? "vaza: " + r.over.join(" | ") + " " : ""}${r.titles.join(" | ")}${errors.length ? " console: " + errors.join(" / ") : ""}`);
  }
  await context.close();
}
await browser.close();
console.log(problems ? `\n${problems} página(s) com alerta.` : "\nSem alertas.");
process.exitCode = problems ? 1 : 0;
