// Teste da vitrine (refino 3) no Supabase REAL: curadoria, "Avise-me" e avaliações. Lê o .env.local, não imprime chaves
// nem e-mails, e apaga tudo o que cria. Uso: node scripts/supabase/teste-vitrine.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, opts);
const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
let ok = 0;
let fail = 0;
const check = (name, pass, detail = "") => {
  if (pass) ok++;
  else fail++;
  console.log(`${pass ? "✔" : "✖"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const stamp = Date.now();
const cleanup = [];

try {
  // --- curadoria
  const { data: product } = await service.from("products").select("id, slug, bestseller_manual, bestseller_rank").eq("slug", "monaco-racing-tee").single();
  cleanup.push(() => service.from("products").update({ bestseller_manual: product.bestseller_manual, bestseller_rank: product.bestseller_rank }).eq("id", product.id));
  await service.from("products").update({ bestseller_manual: true, bestseller_rank: 9 }).eq("id", product.id);
  const pub = await anon.from("products").select("slug, bestseller_manual, bestseller_rank").eq("slug", "monaco-racing-tee").single();
  check("curadoria: colunas novas legíveis pelo público", pub.data?.bestseller_manual === true && pub.data?.bestseller_rank === 9);
  const sold = await anon.rpc("bestseller_slugs", { p_days: 90, p_limit: 8 });
  check("curadoria: bestseller_slugs com a chave pública", !sold.error && Array.isArray(sold.data), sold.error?.code ?? `${sold.data?.length ?? 0} slug(s), sem quantidades: ${sold.data?.every((row) => Object.keys(row).sort().join() === "place,slug")}`);

  // --- avise-me: variante zerada só para o teste
  const { data: variant } = await service.from("product_variants").select("sku, stock").eq("sku", "APX-003-M").single();
  cleanup.push(() => service.from("product_variants").update({ stock: variant.stock }).eq("sku", variant.sku));
  await service.from("product_variants").update({ stock: 0 }).eq("sku", variant.sku);
  const email = `teste-avise-${stamp}@example.com`;
  cleanup.push(() => service.from("stock_alerts").delete().eq("email", email));
  const insert = await anon.from("stock_alerts").insert({ email, sku: variant.sku, consent: true, consent_text: "Teste automático do avise-me (apagado em seguida)." });
  check("avise-me: inserção anônima em tamanho esgotado", !insert.error, insert.error?.code);
  const read = await anon.from("stock_alerts").select("email").limit(1);
  check("avise-me: leitura anônima bloqueada", Boolean(read.error) || !read.data?.length, read.error ? `bloqueada (${read.error.code})` : "0 linhas");
  const inStock = await anon.from("stock_alerts").insert({ email: `x-${email}`, sku: "APX-003-G", consent: true, consent_text: "Teste automático do avise-me (apagado em seguida)." });
  check("avise-me: recusa tamanho com estoque", Boolean(inStock.error), inStock.error?.code);
  const stored = await service.from("stock_alerts").select("sku").eq("email", email);
  check("avise-me: o administrador (service) vê o pedido", stored.data?.length === 1);

  // --- avaliações: pedido de teste entregue → envio → fila → aprovação → público
  const orderId = `TST-AV-${stamp}`;
  cleanup.push(async () => {
    await service.rpc("release_order_stock", { p_order_id: orderId });
    const { data } = await service.from("orders").select("customer_id").eq("id", orderId).maybeSingle();
    await service.from("orders").delete().eq("id", orderId);
    if (data?.customer_id) await service.from("customers").delete().eq("id", data.customer_id);
  });
  const buyer = `teste-avaliacao-${stamp}@example.com`;
  const created = await service.rpc("create_order", {
    p_order: {
      id: orderId,
      customer: { name: "Teste Avaliação", email: buyer, phone: "11999999999" },
      address: { street: "Rua Teste", number: "1", district: "Centro", city: "São Paulo", state: "SP", cep: "01000000" },
      shipping: { id: "economica", label: "Econômica", days: "Teste", priceCents: 0 },
      payment_method: "pix",
      items: [{ sku: "APX-001-P", quantity: 1 }],
      is_test: true,
    },
  });
  check("avaliações: pedido de teste criado", !created.error, created.error?.code);
  await service.from("orders").update({ status: "entregue", is_test: true }).eq("id", orderId);
  const sent = await service.rpc("submit_review", { p_order_id: orderId, p_email: buyer, p_product_slug: "scuderia-racing-jacket", p_rating: 5, p_title: "Teste automático", p_body: "Avaliação de teste, apagada em seguida.", p_display_name: "Teste" });
  check("avaliações: envio pelo cliente grava pendente", sent.data === "ok", String(sent.data ?? sent.error?.code));
  const pendingPublic = await anon.from("reviews").select("id").eq("product_slug", "scuderia-racing-jacket");
  check("avaliações: pendente não aparece ao público", !pendingPublic.data?.length);
  const queue = await service.from("reviews").select("id, status").eq("order_id", orderId);
  check("avaliações: está na fila de moderação", queue.data?.[0]?.status === "pendente");
  await service.from("reviews").update({ status: "aprovada" }).eq("order_id", orderId);
  const approved = await anon.from("reviews").select("rating, display_name").eq("product_slug", "scuderia-racing-jacket");
  check("avaliações: aprovada aparece ao público (só colunas de exibição)", approved.data?.length === 1);
  const leak = await anon.from("reviews").select("order_id").limit(1);
  check("avaliações: público não lê o pedido", Boolean(leak.error), leak.error?.code);
} catch (error) {
  fail++;
  console.log("✖ erro:", error instanceof Error ? error.message.slice(0, 120) : "erro");
} finally {
  for (const step of cleanup.reverse()) await step();
  const left = await service.from("orders").select("id", { count: "exact", head: true }).like("id", `TST-AV-${stamp}%`);
  console.log(`limpeza: pedidos de teste restantes ${left.count ?? 0}`);
  console.log(`passaram ${ok}, falharam ${fail}`);
}
