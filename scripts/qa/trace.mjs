// Medição de quadros (refino 3, item 4.6): rola a página inteira (30 px por quadro, como uma rolagem rápida) no build de
// produção, sem limitação de CPU e com CPU 4× mais lenta (Emulation.setCPUThrottlingRate), grava o trace do Chrome
// (DevTools → Performance → carregar o .json.gz) e conta os quadros longos pelos intervalos do requestAnimationFrame.
// Uso: node scripts/qa/trace.mjs [http://localhost:3001] [pasta=docs/refino-3/traces] /rota1 /rota2 ...
// Metas: sem limitação, nenhum quadro acima de 20 ms; com 4×, no máximo 2 acima de 33 ms.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const noTrace = process.argv.includes("--sem-trace"); // só os quadros (o trace em si pesa no navegador)
const args = process.argv.slice(2).filter((arg) => arg !== "--sem-trace");
const base = args[0]?.startsWith("http") ? args.shift() : "http://localhost:3001";
const out = args[0] && !args[0].startsWith("/") ? args.shift() : "docs/refino-3/traces";
const routes = args.length ? args : ["/", "/produtos"];
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", ...(process.env.PW_EXECUTABLE_PATH ? { channel: undefined, executablePath: process.env.PW_EXECUTABLE_PATH } : {}) });
for (const route of routes) {
  for (const rate of [1, 4]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const cdp = await page.context().newCDPSession(page);
    await page.goto(base + route, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-hydrated"), null, { timeout: 30_000 });
    await page.waitForTimeout(2500);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    const events = [];
    cdp.on("Tracing.dataCollected", (data) => events.push(...data.value));
    if (!noTrace) await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline.frame,blink.user_timing,v8.execute", transferMode: "ReportEvents" });
    const deltas = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const list = [];
          let last = performance.now();
          const step = (now) => {
            list.push(now - last);
            last = now;
            window.scrollBy(0, 30);
            if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2 || list.length > 1500) resolve(list.slice(1));
            else requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }),
    );
    if (!noTrace) {
      const done = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
      await cdp.send("Tracing.end");
      await done;
    }
    const name = `${route === "/" ? "home" : route.replace(/^\//, "").replace(/[/?=&]+/g, "-")}-cpu${rate}x.json.gz`;
    if (!noTrace) fs.writeFileSync(path.join(out, name), zlib.gzipSync(JSON.stringify({ traceEvents: events })));
    const sorted = [...deltas].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    const over20 = deltas.filter((d) => d > 20).length;
    const over33 = deltas.filter((d) => d > 33).length;
    console.log(`${route} CPU ${rate}×: ${deltas.length} quadros, acima de 20 ms: ${over20}, acima de 33 ms: ${over33}, p95 ${p95.toFixed(1)} ms, máx. ${Math.max(...deltas).toFixed(1)} ms ${noTrace ? "(sem trace)" : `→ ${name}`}`);
    await page.close();
  }
}
await browser.close();
