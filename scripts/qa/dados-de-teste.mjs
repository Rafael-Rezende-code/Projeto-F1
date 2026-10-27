// Dados de TESTE no Supabase real para o e2e do build de produção (loja extra, QA): corridas e drops com "[TESTE]",
// um moletom sob encomenda marcado como personalizável (para aparecer na fila do fornecedor) e, no "apagar", tudo o que
// os testes criaram (pedidos e clientes qa-teste-*@example.com, listas de desejos, lista de espera, kits e cupons de teste).
// Lê o .env.local; não imprime chaves nem e-mails reais.
// Uso: node scripts/qa/dados-de-teste.mjs criar | apagar
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const DAY = 86_400_000;
const check = (what, result) => {
  if (result.error) throw new Error(`${what}: ${result.error.code ?? ""} ${result.error.message}`);
  return result.data;
};

async function criar() {
  const now = Date.now();
  // Fim de semana de teste: a sexta igual ou seguinte a hoje (Brasília), largada no domingo 14:00.
  const today = new Date(now - 3 * 3_600_000);
  const toFriday = (5 - today.getUTCDay() + 7) % 7;
  const friday = new Date(today.getTime() + toFriday * DAY).toISOString().slice(0, 10);
  const raceStart = new Date(new Date(`${friday}T14:00:00-03:00`).getTime() + 2 * DAY).toISOString();
  check("corrida", await db.from("race_weekends").insert({ gp_name: "[TESTE] GP de Teste", circuit: "Circuito de teste", country: "Teste", weekend_start: friday, race_start: raceStart, tags: ["camiseta"], active: true }));
  check("drops", await db.from("drops").insert([
    { slug: "teste-em-breve", title: "[TESTE] Drop em breve", description: "Drop de teste do QA (apagado em seguida).", launch_at: new Date(now + 3 * DAY).toISOString(), mode: "lancamento", per_order_limit: 1, product_slugs: ["bone-hamilton"], active: true },
    { slug: "teste-pre-venda", title: "[TESTE] Pré-venda", description: "Pré-venda de teste do QA (apagada em seguida).", launch_at: new Date(now - DAY).toISOString(), mode: "pre_venda", ship_estimate: "a partir de 20/12", per_order_limit: 2, product_slugs: ["poster-hamilton"], active: true },
  ]));
  check("personalização", await db.from("products").update({ personalizable: true, personalization_fee_cents: 3000 }).eq("slug", "moletom-ferrari"));
  console.log(`criados: 1 corrida (sexta ${friday}), 2 drops, moletom-ferrari personalizável`);
}

async function apagar() {
  const counts = {};
  const orders = check("pedidos", await db.from("orders").select("id, customer_id").like("customer_email", "qa-teste-%@example.com"));
  for (const order of orders) await db.rpc("release_order_stock", { p_order_id: order.id });
  if (orders.length) check("apagar pedidos", await db.from("orders").delete().in("id", orders.map((order) => order.id)));
  counts.pedidos = orders.length;
  counts.clientes = (check("clientes", await db.from("customers").delete().like("email", "qa-teste-%@example.com").select("id")) ?? []).length;
  counts.corridas = (check("corridas", await db.from("race_weekends").delete().like("gp_name", "[TESTE]%").select("id")) ?? []).length;
  counts.drops = (check("drops", await db.from("drops").delete().like("slug", "teste-%").select("id")) ?? []).length;
  counts.listas = (check("listas", await db.from("wishlists").delete().like("name", "QA Teste%").select("id")) ?? []).length;
  counts.kits = (check("kits", await db.from("kits").delete().like("slug", "teste-%").select("id")) ?? []).length;
  counts.cupons = (check("cupons", await db.from("coupons").delete().like("code", "QATESTE%").select("id")) ?? []).length;
  check("personalização", await db.from("products").update({ personalizable: false, personalization_fee_cents: 0 }).eq("slug", "moletom-ferrari"));
  const users = check("usuários", await db.auth.admin.listUsers({ perPage: 200 }));
  for (const user of users.users.filter((item) => item.email?.startsWith("qa-teste-"))) await db.auth.admin.deleteUser(user.id);
  await db.from("admin_emails").delete().like("email", "qa-teste-%");
  const left = {
    corridas: (await db.from("race_weekends").select("id", { count: "exact", head: true }).like("gp_name", "[TESTE]%")).count,
    drops: (await db.from("drops").select("id", { count: "exact", head: true }).like("slug", "teste-%")).count,
    pedidos: (await db.from("orders").select("id", { count: "exact", head: true }).like("customer_email", "qa-teste-%@example.com")).count,
  };
  console.log("apagados:", JSON.stringify(counts), "| restantes:", JSON.stringify(left));
}

const command = process.argv[2];
if (command === "criar") await criar();
else if (command === "apagar") await apagar();
else console.log("uso: node scripts/qa/dados-de-teste.mjs criar | apagar");
