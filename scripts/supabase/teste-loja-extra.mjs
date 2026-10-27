// Teste da loja extra no Supabase REAL (atualização 4): Pix, kits, cupom × kit, personalização, drops, lista de espera,
// lista de desejos e importação do calendário (administrador temporário). Chama a create_order como o servidor do site
// (service role) e confere a chave pública onde ela entra. Lê o .env.local; não imprime chaves nem e-mails reais; apaga
// tudo o que cria (pedidos devolvem estoque e cupom). Uso: node scripts/supabase/teste-loja-extra.mjs
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
let ok = 0;
let fail = 0;
const check = (name, pass, detail = "") => {
  if (pass) ok++;
  else fail++;
  console.log(`${pass ? "✔" : "✖"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const stamp = Date.now();
const orderIds = [];
const cleanup = [];
let n = 0;

const order = async (items, extra = {}) => {
  const id = `TST-LX-${stamp}-${++n}`;
  orderIds.push(id);
  const result = await service.rpc("create_order", {
    p_order: {
      id,
      customer: { name: "Teste Loja Extra", email: `qa-teste-banco-${stamp}@example.com`, phone: "11999999999" },
      address: { street: "Rua Teste", number: "1", district: "Centro", city: "São Paulo", state: "SP", cep: "01000000" },
      shipping: { id: "economica", label: "Econômica", days: "Teste", priceCents: 2490 },
      payment_method: "cartao",
      items,
      ...extra,
    },
  });
  return result;
};
const inStock = async (slug, min = 2) => {
  const { data } = await service.from("product_variants").select("sku, stock, products!inner(slug, price_cents)").eq("products.slug", slug).gte("stock", min).limit(1);
  return data?.[0] ? { sku: data[0].sku, price: data[0].products.price_cents } : null;
};

try {
  const tee = await inStock("camiseta-hamilton");
  const cap = await inStock("bone-hamilton");
  const poster = await inStock("poster-hamilton");
  if (!tee || !cap || !poster) throw new Error("sem estoque de teste nas peças do Hamilton");

  // --- Pix
  const pix = await order([{ sku: tee.sku, quantity: 1 }], { payment_method: "pix", pix_percent: 5 });
  check("Pix: pedido criado", !pix.error, pix.error?.code);
  check("Pix: grava o meio e o desconto (5% dos itens, sem frete)", pix.data?.payment_method === "pix" && pix.data?.payment_discount_cents === Math.round(tee.price * 0.05) && pix.data?.payment_discount_percent === 5, `${pix.data?.payment_discount_cents} centavos`);
  const card = await order([{ sku: tee.sku, quantity: 1 }], { pix_percent: 5 });
  check("Pix: cartão não tem desconto", card.data?.payment_discount_cents === 0);

  // --- Kits (kit de teste com as 3 peças do Hamilton)
  const kitSlug = `teste-kit-${stamp}`;
  cleanup.push(() => service.from("kits").delete().eq("slug", kitSlug));
  const kit = await service.from("kits").insert({ slug: kitSlug, title: "Kit de teste", product_slugs: ["camiseta-hamilton", "bone-hamilton", "poster-hamilton"], discount_percent: 10, active: true });
  check("kits: kit de teste criado", !kit.error, kit.error?.code);
  const full = await order([{ sku: tee.sku, quantity: 1 }, { sku: cap.sku, quantity: 1 }, { sku: poster.sku, quantity: 1 }]);
  const expectedKit = Math.round(((tee.price + cap.price + poster.price) * 10) / 100);
  check("kits: desconto com todas as peças", full.data?.kit_discount_cents === expectedKit, `${full.data?.kit_discount_cents} centavos`);
  const partial = await order([{ sku: tee.sku, quantity: 1 }, { sku: cap.sku, quantity: 1 }]);
  check("kits: sem uma peça, sem desconto", partial.data?.kit_discount_cents === 0);

  // --- Cupom × kit
  const code = `QATESTE${stamp}`.slice(0, 30);
  cleanup.push(() => service.from("coupons").delete().eq("code", code));
  await service.from("coupons").insert({ code, kind: "percentual", value: 10, active: true });
  const both = await order([{ sku: tee.sku, quantity: 1 }, { sku: cap.sku, quantity: 1 }, { sku: poster.sku, quantity: 1 }], { coupon: code });
  check("cupom × kit: recusado juntos por padrão", /CUPOM_INVALIDO/.test(both.error?.message ?? "") && both.error?.details === "com_kit", both.error?.details);
  const allowed = await order([{ sku: tee.sku, quantity: 1 }, { sku: cap.sku, quantity: 1 }, { sku: poster.sku, quantity: 1 }], { coupon: code, coupon_with_kit: true });
  check("cupom × kit: aceito quando a política permite", !allowed.error && allowed.data?.discount_cents > 0 && allowed.data?.kit_discount_cents === expectedKit);
  const couponOnly = await order([{ sku: tee.sku, quantity: 1 }], { coupon: code });
  check("cupom sem kit: aceito", !couponOnly.error && couponOnly.data?.discount_cents > 0);

  // --- Personalização (camisa de teste marcada como personalizável só durante o teste)
  const before = (await service.from("products").select("personalizable, personalization_fee_cents").eq("slug", "camiseta-hamilton").single()).data;
  cleanup.push(() => service.from("products").update(before).eq("slug", "camiseta-hamilton"));
  await service.from("products").update({ personalizable: true, personalization_fee_cents: 3000 }).eq("slug", "camiseta-hamilton");
  const personal = await order([{ sku: tee.sku, quantity: 1, personalization: { name: "TESTE QA", number: "7" } }]);
  const item = (await service.from("order_items").select("personalization, personalization_fee_cents").eq("order_id", personal.data?.id ?? "x").single()).data;
  check("personalização: grava nome, número e adicional em order_items", item?.personalization?.name === "TESTE QA" && item?.personalization?.number === "7" && item?.personalization_fee_cents === 3000 && personal.data?.subtotal_cents === tee.price + 3000);
  const badName = await order([{ sku: tee.sku, quantity: 1, personalization: { name: "nome minusculo" } }]);
  check("personalização: formato inválido é recusado", /PERSONALIZACAO_INVALIDA/.test(badName.error?.message ?? ""));
  const notAllowed = await order([{ sku: cap.sku, quantity: 1, personalization: { name: "TESTE" } }]);
  check("personalização: produto não personalizável recusa", /PERSONALIZACAO_INVALIDA/.test(notAllowed.error?.message ?? ""));
  const lookup = await service.rpc("lookup_order", { p_order_id: personal.data?.id, p_email: `qa-teste-banco-${stamp}@example.com` });
  check("personalização: aparece na consulta do pedido", lookup.data?.items?.some((row) => row.personalization?.name === "TESTE QA"));

  // --- Drops
  const dropSlug = `teste-drop-${stamp}`;
  cleanup.push(() => service.from("drops").delete().eq("slug", dropSlug));
  const drop = (await service.from("drops").insert({ slug: dropSlug, title: "Drop de teste", launch_at: new Date(Date.now() + 86_400_000).toISOString(), mode: "lancamento", per_order_limit: 1, product_slugs: ["poster-hamilton"], active: true }).select("id").single()).data;
  const early = await order([{ sku: poster.sku, quantity: 1 }]);
  check("drops: compra bloqueada antes da data", /DROP_NAO_LIBERADO/.test(early.error?.message ?? ""));
  await service.from("drops").update({ launch_at: new Date(Date.now() - 60_000).toISOString() }).eq("slug", dropSlug);
  const over = await order([{ sku: poster.sku, quantity: 2 }]);
  check("drops: acima do limite por pedido é recusado", /DROP_LIMITE/.test(over.error?.message ?? ""));
  const released = await order([{ sku: poster.sku, quantity: 1 }]);
  check("drops: liberado depois da data", !released.error, released.error?.code);
  const join = await anon.from("drop_waitlist").insert({ drop_id: drop.id, email: `qa-teste-espera-${stamp}@example.com`, consent: true, consent_text: "Teste automático da lista de espera (apagado em seguida)." });
  check("lista de espera: inserção anônima", !join.error, join.error?.code);
  const read = await anon.from("drop_waitlist").select("email").limit(1);
  check("lista de espera: leitura anônima bloqueada", Boolean(read.error) || !read.data?.length, read.error?.code ?? "0 linhas");

  // --- Lista de desejos (link curto: o servidor grava; o público não lê)
  const token = randomBytes(8).toString("hex").slice(0, 10).replace(/[^A-Za-z0-9]/g, "a");
  cleanup.push(() => service.from("wishlists").delete().eq("token", token));
  const wish = await service.from("wishlists").insert({ token, name: "QA Teste", product_slugs: ["camiseta-hamilton"], secret_hash: "teste" });
  check("lista de desejos: link curto gravado pelo servidor", !wish.error, wish.error?.code);
  const wishRead = await anon.from("wishlists").select("token").eq("token", token);
  check("lista de desejos: público não lê a tabela", Boolean(wishRead.error) || !wishRead.data?.length);

  // --- Corridas: importação da temporada como administrador (RLS de admin), com prévia
  const adminEmail = `qa-teste-admin-banco-${stamp}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const user = (await service.auth.admin.createUser({ email: adminEmail, password, email_confirm: true })).data.user;
  await service.from("admin_emails").upsert({ email: adminEmail }, { onConflict: "email" });
  cleanup.push(async () => {
    await service.from("admin_emails").delete().eq("email", adminEmail);
    if (user) await service.auth.admin.deleteUser(user.id);
  });
  const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
  await adminClient.auth.signInWithPassword({ email: adminEmail, password });
  const { parseJolpicaSeason, JOLPICA_URL } = await import("../../lib/calendar-import.ts").catch(() => ({}));
  // A próxima temporada só aparece na fonte quando é publicada; sem ela, a atual.
  let season = new Date().getFullYear() + 1;
  let races = [];
  for (const year of [season, season - 1]) {
    races = parseJolpicaSeason ? parseJolpicaSeason(await (await fetch(JOLPICA_URL(year))).json()).races : [];
    season = year;
    if (races.length) break;
  }
  check(`corridas: prévia da temporada ${season} pela fonte aberta`, races.length > 0, `${races.length} corrida(s); 1ª: ${races[0]?.gpName} em ${races[0] ? new Date(races[0].raceStart).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"} (Brasília)`);
  const keys = races.map((race) => `${race.sourceKey}-teste-${stamp}`);
  cleanup.push(() => service.from("race_weekends").delete().in("source_key", keys));
  const imported = await adminClient.from("race_weekends").upsert(races.map((race, index) => ({ source_key: keys[index], gp_name: `[TESTE] ${race.gpName}`, circuit: race.circuit, country: race.country, weekend_start: race.weekendStart, race_start: race.raceStart, active: false })), { onConflict: "source_key" }).select("id");
  check("corridas: o administrador grava a temporada (escondida)", !imported.error && imported.data?.length === races.length, imported.error?.code ?? `${imported.data?.length} gravadas`);
  const publicRaces = await anon.from("race_weekends").select("id").in("source_key", keys);
  check("corridas: escondidas não aparecem ao público", !publicRaces.data?.length);
} catch (error) {
  fail++;
  console.log("✖ erro:", error instanceof Error ? error.message.slice(0, 160) : "erro");
} finally {
  for (const id of orderIds) await service.rpc("release_order_stock", { p_order_id: id });
  if (orderIds.length) await service.from("orders").delete().in("id", orderIds);
  await service.from("customers").delete().eq("email", `qa-teste-banco-${stamp}@example.com`);
  for (const step of cleanup.reverse()) await step();
  const left = await service.from("orders").select("id", { count: "exact", head: true }).like("id", `TST-LX-${stamp}%`);
  console.log(`limpeza: pedidos de teste restantes ${left.count ?? 0}`);
  console.log(`passaram ${ok}, falharam ${fail}`);
}
