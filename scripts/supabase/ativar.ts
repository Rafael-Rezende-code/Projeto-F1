// Ativação e teste do Supabase (feat/carros): `pnpm supabase:ativar`.
//
// Lê o .env.local (NUNCA imprime valores: tudo que sai passa por mask(), que esconde as chaves) e confere, em português:
//  (a) a conexão com o projeto (URL, chaves anon e service_role, e se não estão trocadas);
//  (b) as tabelas, as funções e o bucket de fotos, e quantos registros o seed trouxe (aponta o que faltar);
//  (c) cada e-mail de ADMIN_EMAILS em admin_emails (idempotente: só insere o que falta);
//  (d) com a chave pública (anon): o catálogo é legível; custo/fornecedor, newsletter, cupons, histórico, e-mails e
//      limites NÃO são; as funções de pedido/painel não executam; e nenhuma escrita
//      é permitida (nem upload de foto, nem criar pedido);
//  (e) a baixa de estoque (função create_order) com um pedido de teste, inclusive estoque insuficiente; tudo é apagado
//      e o estoque volta ao que era;
//  (f) o importador de produtos pela mesma camada de código do painel (lib/admin/import-run.ts), SEM login manual:
//      cria um administrador temporário, importa docs/modelos/produtos-exemplo.csv, confere que custo e fornecedor só
//      existem na tabela privada e não aparecem nas respostas públicas (nem nas páginas, se o site local estiver no ar)
//      e apaga os produtos de teste, as fotos enviadas e o usuário temporário.
//
// Uso: pnpm supabase:ativar            (tudo)
//      pnpm supabase:ativar --sem-importador   (pula o item f)
// Roda com `tsx --tsconfig tsconfig.scripts.json` (que troca o pacote "server-only", só do Next, por um arquivo vazio). Não grava segredo em lugar nenhum.
// Sai com código 0 se nada FALHOU, 1 se algo falhou e 2 se faltam variáveis.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createMask, jwtRole, loadEnvFile, maskEmail, secretsFrom } from "./ativar-lib";

type Status = "ok" | "falhou" | "aviso" | "pulado";
const results: { group: string; name: string; status: Status; detail: string }[] = [];

// ---------------------------------------------------------------------------------------------------------------------
// Saída sem segredos
let mask = createMask([]);
let currentGroup = "";
const group = (title: string) => {
  currentGroup = title;
  console.log(`\n${title}`);
};
const icon: Record<Status, string> = { ok: "✔", falhou: "✖", aviso: "⚠", pulado: "–" };
function report(name: string, status: Status, detail = "") {
  results.push({ group: currentGroup, name, status, detail: mask(detail) });
  console.log(`  ${icon[status]} ${name}${detail ? ` — ${mask(detail)}` : ""}`);
}

const errorText = (error: { message?: string; code?: string } | null | undefined) => (error ? `${error.code ? `${error.code}: ` : ""}${error.message ?? "erro"}` : "");

// ---------------------------------------------------------------------------------------------------------------------
async function main() {
  const root = process.cwd();
  const envPath = path.join(root, ".env.local");
  console.log("Ativação do Supabase (nenhuma chave é impressa).");
  if (!existsSync(envPath)) {
    console.log("\n✖ Não achei o .env.local na raiz do projeto. Crie-o a partir do .env.example e preencha os nomes abaixo.");
    process.exit(2);
  }
  const env = loadEnvFile(envPath);
  mask = createMask(secretsFrom(env));

  // ---- variáveis
  group("0. Variáveis do .env.local");
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAILS"] as const;
  const missing = required.filter((name) => !env[name]);
  for (const name of required) report(name, env[name] ? "ok" : "falhou", env[name] ? "preenchida" : "FALTA (ou está vazia)");
  const leaked = Object.keys(env).filter((name) => /^NEXT_PUBLIC_.*(SERVICE|SECRET)/i.test(name));
  for (const name of leaked) report(name, "falhou", "variável secreta com prefixo NEXT_PUBLIC_ iria para o navegador: renomeie para SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    console.log(`\nFaltam ${missing.length} variável(is) no .env.local: ${missing.join(", ")}.`);
    console.log("Veja .env.example e docs/backend/supabase.md (passo 5). Nada mais foi testado.");
    process.exit(2);
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmails = [...new Set(env.ADMIN_EMAILS.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean))];
  report("URL do projeto", /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/.test(url) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url) ? "ok" : "aviso", "formato esperado: https://<projeto>.supabase.co");
  if (anonKey === serviceKey) report("chaves anon e service_role", "falhou", "são IGUAIS: a service_role tem que ser a chave secreta, diferente da anon");
  const anonRole = jwtRole(anonKey);
  const serviceRole = jwtRole(serviceKey);
  if (anonRole && anonRole !== "anon") report("chave anon", "falhou", `é uma chave "${anonRole}" (parece trocada com a service_role)`);
  if (serviceRole && serviceRole !== "service_role") report("chave service_role", "falhou", `é uma chave "${serviceRole}" (parece trocada com a anon)`);
  if (adminEmails.some((email) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) report("ADMIN_EMAILS", "falhou", "algum e-mail é inválido");

  const opts = { auth: { persistSession: false, autoRefreshToken: false } } as const;
  const service = createClient(url, serviceKey, opts);
  const anon = createClient(url, anonKey, opts);

  // ---- (a) conexão
  group("a) Conexão");
  const started = Date.now();
  const conn = await service.from("categories").select("slug", { count: "exact", head: true });
  if (conn.error) {
    report("service_role no projeto", "falhou", errorText(conn.error));
    console.log("\nSem conexão válida com o projeto (URL ou service_role errada, ou o SQL do setup ainda não foi rodado). Parei aqui.");
    summary();
    return;
  }
  report("service_role no projeto", "ok", `${Date.now() - started} ms`);
  const connAnon = await anon.from("categories").select("slug", { count: "exact", head: true });
  report("chave anon no projeto", connAnon.error ? "falhou" : "ok", connAnon.error ? errorText(connAnon.error) : "leitura do catálogo respondeu");

  // ---- (b) tabelas, funções e bucket
  group("b) Tabelas, funções, bucket e registros do seed");
  const { seedData } = await import("@/lib/catalog/seed-repository");
  const expected: Record<string, number> = {
    categories: seedData.categories.length,
    teams: seedData.teams.length,
    drivers: seedData.drivers.length,
    products: seedData.products.length,
    product_variants: seedData.products.reduce((sum, product) => sum + product.variants.length, 0),
    product_images: seedData.products.reduce((sum, product) => sum + product.images.length, 0),
  };
  const tables = ["admin_emails", "categories", "teams", "drivers", "products", "product_variants", "product_images", "product_private", "customers", "orders", "order_items", "payment_events", "newsletter_subscribers", "coupons", "coupon_redemptions", "rate_limit_hits", "order_events", "email_log"];
  // Tabelas da operação (cupons, limites, histórico, e-mails): vêm no supabase/atualizacao-2.sql num banco já ativo.
  const missingTables: string[] = [];
  for (const table of tables) {
    const { count, error } = await service.from(table).select("*", { count: "exact", head: true });
    if (error) {
      const absent = /does not exist|schema cache|PGRST205|42P01/i.test(`${error.code} ${error.message}`);
      report(`tabela ${table}`, "falhou", absent ? "NÃO EXISTE (banco novo: setup-completo.sql; banco ativo: atualizacao-2.sql)" : errorText(error));
      if (absent) missingTables.push(table);
      continue;
    }
    const want = expected[table];
    if (want === undefined) report(`tabela ${table}`, "ok", `${count ?? 0} registro(s)`);
    else if ((count ?? 0) < want) report(`tabela ${table}`, "falhou", `${count ?? 0} registro(s); o seed tem ${want}: rode o supabase/setup-completo.sql (ou pnpm supabase:seed --push)`);
    else report(`tabela ${table}`, "ok", `${count} registro(s) (seed: ${want})`);
  }
  for (const [table, column] of [["products", "fulfillment"], ["order_items", "item_status"]] as const) {
    const { error } = await service.from(table).select(column).limit(1);
    report(`coluna ${table}.${column} (migration do modelo de venda)`, error ? "falhou" : "ok", error ? "falta rodar a migration 20261023000000_modelo_de_venda.sql" : "");
  }
  const functionExists = async (name: string, args: Record<string, unknown>) => {
    const { error } = await service.rpc(name, args);
    return !(error && /PGRST202|Could not find the function|42883/i.test(`${error.code} ${error.message}`));
  };
  for (const [name, args] of [["is_admin", {}], ["create_order", { p_order: {} }], ["release_order_stock", { p_order_id: "__inexistente__" }], ["import_products", { p_items: [] }]] as const) {
    report(`função ${name}`, (await functionExists(name, args as Record<string, unknown>)) ? "ok" : "falhou", "");
  }
  const buckets = await service.storage.listBuckets();
  const bucket = buckets.data?.find((item) => item.id === "produtos");
  report("bucket de fotos \"produtos\"", bucket ? (bucket.public ? "ok" : "aviso") : "falhou", bucket ? (bucket.public ? "existe e é público (leitura)" : "existe, mas NÃO é público: as fotos não abririam no site") : buckets.error ? errorText(buckets.error) : "NÃO EXISTE (o setup-completo.sql cria)");
  if (missingTables.length) report("resumo das tabelas", "falhou", `faltam: ${missingTables.join(", ")}`);

  // ---- (c) admin_emails
  group("c) E-mails de administrador (admin_emails)");
  const existing = await service.from("admin_emails").select("email");
  if (existing.error) report("ler admin_emails", "falhou", errorText(existing.error));
  else {
    const have = new Set((existing.data ?? []).map((row) => row.email as string));
    const toAdd = adminEmails.filter((email) => !have.has(email));
    if (toAdd.length) {
      const { error } = await service.from("admin_emails").upsert(toAdd.map((email) => ({ email })), { onConflict: "email", ignoreDuplicates: true });
      report(`inserir ${toAdd.length} e-mail(s) que faltavam`, error ? "falhou" : "ok", error ? errorText(error) : toAdd.map(maskEmail).join(", "));
    }
    for (const email of adminEmails.filter((item) => have.has(item))) report(`${maskEmail(email)} já estava em admin_emails`, "ok");
    const extras = [...have].filter((email) => !adminEmails.includes(email) && !email.startsWith("apex-teste-"));
    if (extras.length) report("e-mails em admin_emails que NÃO estão em ADMIN_EMAILS", "aviso", `${extras.length} (o painel só deixa entrar quem está nas duas listas)`);
  }

  // ---- (d) o que a chave pública NÃO pode
  await publicAccess(service, anon);

  // ---- (e) baixa de estoque
  await stockTest(service);

  // ---- (f) importador
  if (process.argv.includes("--sem-importador")) {
    group("f) Importador de produtos (CSV de exemplo)");
    report("importador", "pulado", "--sem-importador");
  } else await importerTest(service, anon, url, anonKey, opts);

  summary();
}

// ---------------------------------------------------------------------------------------------------------------------
async function publicAccess(service: SupabaseClient, anon: SupabaseClient) {
  group("d) Chave pública (anon): leitura do catálogo sim; custo/fornecedor e escrita não");
  const stamp = Date.now();
  const activeCount = await service.from("products").select("*", { count: "exact", head: true }).eq("status", "active");
  const publicRead = await anon.from("products").select("slug, name, price_cents, status").limit(200);
  if (publicRead.error) report("ler o catálogo", "falhou", errorText(publicRead.error));
  else {
    const rows = publicRead.data ?? [];
    report("ler o catálogo", rows.length > 0 ? "ok" : "falhou", `${rows.length} produto(s) legíveis`);
    report("só produtos ativos aparecem (rascunhos ficam escondidos)", rows.every((row) => row.status === "active") ? "ok" : "falhou", `${rows.filter((row) => row.status !== "active").length} fora de "active"`);
    if (activeCount.count !== null && rows.length < Math.min(activeCount.count, 200)) report("quantidade pública x ativos", "aviso", `${rows.length} legíveis de ${activeCount.count} ativos`);
  }
  const variants = await anon.from("product_variants").select("sku, stock").limit(1);
  report("ler tamanhos e estoque", variants.error || !variants.data?.length ? "falhou" : "ok", variants.error ? errorText(variants.error) : "");

  // Tabelas que a chave pública não pode ler: erro de permissão OU zero linhas (RLS). Linhas = vazamento.
  // Operação (fase 5): cupons, usos, histórico, e-mails, limites e a lista da newsletter também precisam ficar fechados.
  for (const table of ["product_private", "orders", "order_items", "customers", "payment_events", "admin_emails", "newsletter_subscribers", "coupons", "coupon_redemptions", "order_events", "email_log", "rate_limit_hits"]) {
    const { data, error } = await anon.from(table).select("*").limit(5);
    if (error) report(`${table}: leitura pública`, "ok", `bloqueada (${error.code ?? "erro"})`);
    else if (!data?.length) report(`${table}: leitura pública`, (await service.from(table).select("*", { count: "exact", head: true })).count ? "ok" : "aviso", "0 linhas visíveis (RLS filtra)");
    else report(`${table}: leitura pública`, "falhou", `VAZAMENTO: ${data.length} linha(s) legíveis sem login`);
  }
  const privateCheck = await anon.from("product_private").select("cost_cents, supplier_url, supplier_shipping_cents, notes").limit(1);
  report("custo e fornecedor (product_private) NÃO legíveis", !privateCheck.error && privateCheck.data?.length ? "falhou" : "ok", privateCheck.error ? `bloqueado: ${privateCheck.error.code ?? ""}` : "");

  // Escritas: cada tentativa usa uma linha descartável criada pela service_role e conferida depois.
  const slug = `zz-teste-anon-${stamp}`;
  const seedRow = await service.from("categories").insert({ slug, name: "ZZ teste anon", description: "", image: "", position: 9999 });
  if (seedRow.error) {
    report("linha descartável para os testes de escrita", "falhou", errorText(seedRow.error));
    return;
  }
  try {
    const insert = await anon.from("categories").insert({ slug: `${slug}-novo`, name: "x", description: "", image: "", position: 9999 });
    report("criar registro (insert)", insert.error ? "ok" : "falhou", insert.error ? "bloqueado" : "A CHAVE PÚBLICA CONSEGUIU INSERIR");
    const update = await anon.from("categories").update({ name: "ZZ alterado pelo anon" }).eq("slug", slug).select();
    const after = await service.from("categories").select("name").eq("slug", slug).single();
    report("alterar registro (update)", !update.error && (update.data?.length ?? 0) > 0 || after.data?.name !== "ZZ teste anon" ? "falhou" : "ok", update.error ? "bloqueado" : "0 linhas alteradas");
    const del = await anon.from("categories").delete().eq("slug", slug).select();
    const stillThere = await service.from("categories").select("slug").eq("slug", slug);
    report("apagar registro (delete)", (del.data?.length ?? 0) > 0 || !stillThere.data?.length ? "falhou" : "ok", del.error ? "bloqueado" : "0 linhas apagadas");
    const price = await service.from("products").select("slug, price_cents").limit(1).single();
    if (price.data) {
      const hack = await anon.from("products").update({ price_cents: price.data.price_cents }).eq("slug", price.data.slug).select();
      report("alterar preço de produto", (hack.data?.length ?? 0) > 0 ? "falhou" : "ok", hack.error ? "bloqueado" : "0 linhas alteradas");
    }
    const rpcs = [
      ["create_order", { p_order: { id: "APX-TESTE-ANON", items: [] } }],
      ["release_order_stock", { p_order_id: "APX-TESTE-ANON" }],
      ["import_products", { p_items: [] }],
      ["cancel_order", { p_order_id: "APX-TESTE-ANON", p_reason: "teste anon", p_confirm_shipped: false }],
      ["mark_order_refunded", { p_order_id: "APX-TESTE-ANON", p_note: "teste anon" }],
      ["admin_dashboard", { p_since: new Date().toISOString(), p_low_stock: 3, p_include_test: false }],
      ["lookup_order", { p_order_id: "APX-TESTE-ANON", p_email: "teste@example.invalid" }],
      ["rate_limit_hit", { p_bucket: "teste", p_key_hash: "0".repeat(64), p_limit: 1, p_window_seconds: 60 }],
      ["claim_order_email", { p_order_id: "APX-TESTE-ANON", p_type: "pedido-recebido" }],
      ["log_order_event", { p_order_id: "APX-TESTE-ANON", p_kind: "nota", p_message: "teste anon" }],
    ] as const;
    for (const [name, args] of rpcs) {
      const call = await anon.rpc(name, args as Record<string, unknown>);
      const missing = call.error && /PGRST202|Could not find the function|42883/i.test(`${call.error.code} ${call.error.message}`);
      report(
        `função ${name} com a chave pública`,
        missing ? "aviso" : call.error && /permission denied|42501|not allowed|JWT|SEM_PERMISSAO/i.test(`${call.error.code} ${call.error.message}`) ? "ok" : call.error ? "aviso" : "falhou",
        missing ? "não existe ainda (rode o atualizacao-2.sql)" : call.error ? `bloqueada (${call.error.code ?? "erro"})` : "A CHAVE PÚBLICA EXECUTOU A FUNÇÃO",
      );
    }
    const upload = await anon.storage.from("produtos").upload(`zz-teste/${stamp}.txt`, new Blob(["teste"]), { upsert: true });
    if (!upload.error) await service.storage.from("produtos").remove([`zz-teste/${stamp}.txt`]);
    report("enviar arquivo ao bucket \"produtos\"", upload.error ? "ok" : "falhou", upload.error ? "bloqueado" : "A CHAVE PÚBLICA CONSEGUIU ENVIAR UM ARQUIVO");
    // Newsletter: inserção pública LIMITADA (só com consentimento), leitura só admin.
    const email = `teste-anon-${stamp}@example.invalid`;
    const sub = await anon.from("newsletter_subscribers").insert({ email, consent: true, consent_text: "teste do script supabase:ativar", source: "teste" });
    if (sub.error && /does not exist|PGRST205|42P01/i.test(`${sub.error.code} ${sub.error.message}`)) report("newsletter: inscrição pública", "falhou", "tabela newsletter_subscribers não existe (rode o setup-completo.sql)");
    else {
      report("newsletter: inscrição pública (permitida, limitada)", sub.error ? "falhou" : "ok", sub.error ? errorText(sub.error) : "");
      const read = await anon.from("newsletter_subscribers").select("email").limit(1);
      report("newsletter: leitura pública", !read.error && read.data?.length ? "falhou" : "ok", read.error ? "bloqueada" : "0 linhas visíveis");
      const noConsent = await anon.from("newsletter_subscribers").insert({ email: `sem-consentimento-${stamp}@example.invalid`, consent: false, consent_text: "x", source: "teste" });
      report("newsletter: recusa inscrição sem consentimento", noConsent.error ? "ok" : "falhou", noConsent.error ? "bloqueada" : "ACEITOU SEM CONSENTIMENTO");
      await service.from("newsletter_subscribers").delete().like("email", `%${stamp}@example.invalid`);
    }
  } finally {
    await service.from("categories").delete().like("slug", `${slug}%`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
async function stockTest(service: SupabaseClient) {
  group("e) Baixa de estoque (create_order) com pedido de teste");
  const pick = await service.from("product_variants").select("sku, stock, products!inner(status, price_cents)").eq("products.status", "active").gte("stock", 2).limit(1);
  const variant = pick.data?.[0] as unknown as { sku: string; stock: number; products: { price_cents: number } | { price_cents: number }[] } | undefined;
  if (pick.error || !variant) {
    report("achar uma variante com estoque", "falhou", pick.error ? errorText(pick.error) : "nenhum produto ativo com estoque ≥ 2 (rode o seed)");
    return;
  }
  const price = (Array.isArray(variant.products) ? variant.products[0] : variant.products).price_cents;
  const before = variant.stock;
  const id = `APX-TESTE-${Date.now()}`;
  const email = `teste-apex-${Date.now()}@example.invalid`;
  const order = (orderId: string, quantity: number) => ({
    id: orderId,
    customer: { name: "Teste Apex", email, phone: "11999999999" },
    address: { street: "Rua de Teste", number: "1", district: "Centro", city: "São Paulo", state: "SP", cep: "01000000" },
    shipping: { id: "economica", label: "Econômica", days: "7 a 10 dias úteis", priceCents: 0 },
    payment_method: "pix",
    items: [{ sku: variant.sku, quantity }],
  });
  const stockNow = async () => (await service.from("product_variants").select("stock").eq("sku", variant.sku).single()).data?.stock as number | undefined;
  try {
    const created = await service.rpc("create_order", { p_order: order(id, 1) });
    if (created.error) report("pedido de teste de 1 unidade", "falhou", errorText(created.error));
    else {
      const total = (created.data as { total_cents?: number } | null)?.total_cents;
      report("pedido de teste de 1 unidade", "ok", `total calculado pelo banco: ${total} centavos (esperado ${price})`);
      if (total !== price) report("total do pedido = preço do banco", "falhou", `${total} ≠ ${price}`);
      const after = await stockNow();
      report("estoque baixou em 1", after === before - 1 ? "ok" : "falhou", `${before} → ${after}`);
    }
    const tooMany = await service.rpc("create_order", { p_order: order(`${id}-X`, before + 1000) });
    report("estoque insuficiente é recusado", tooMany.error && /ESTOQUE_INSUFICIENTE/.test(tooMany.error.message) ? "ok" : "falhou", tooMany.error ? tooMany.error.message : "o banco ACEITOU vender acima do estoque");
    const created2 = await service.from("orders").select("id").eq("id", `${id}-X`);
    report("e não gravou nada desse pedido", (created2.data?.length ?? 0) === 0 ? "ok" : "falhou");
    const afterFail = await stockNow();
    report("estoque intacto depois da recusa", afterFail === before - 1 ? "ok" : "falhou", `${afterFail}`);
    const released = await service.rpc("release_order_stock", { p_order_id: id });
    report("devolução do estoque", released.data === true && (await stockNow()) === before ? "ok" : "falhou", `${before - 1} → ${await stockNow()}`);
    const twice = await service.rpc("release_order_stock", { p_order_id: id });
    report("devolver de novo não soma duas vezes", twice.data === false && (await stockNow()) === before ? "ok" : "falhou");
  } finally {
    await service.from("orders").delete().in("id", [id, `${id}-X`]);
    await service.from("customers").delete().eq("email", email);
    const final = await stockNow();
    if (final !== before) {
      await service.from("product_variants").update({ stock: before }).eq("sku", variant.sku);
      report("limpeza do estoque", "aviso", `o estoque estava em ${final} e foi restaurado para ${before}`);
    } else report("limpeza: pedido de teste apagado e estoque como antes", "ok", `${variant.sku} = ${before}`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
async function importerTest(service: SupabaseClient, anon: SupabaseClient, url: string, anonKey: string, opts: { auth: { persistSession: false; autoRefreshToken: false } }) {
  group("f) Importador de produtos (CSV de exemplo, pela camada de código do painel, sem login manual)");
  const csvPath = path.join(process.cwd(), "docs", "modelos", "produtos-exemplo.csv");
  if (!existsSync(csvPath)) {
    report("docs/modelos/produtos-exemplo.csv", "falhou", "arquivo não encontrado");
    return;
  }
  const csv = readFileSync(csvPath, "utf8");
  const SLUGS = ["teste-importador-camiseta", "teste-importador-miniatura", "teste-importador-bone"];
  const SENTINEL = "NOTA-PRIVADA-TESTE-7f3a";
  const stamp = Date.now();
  const tempEmail = `apex-teste-${stamp}@example.com`;
  let tempUserId: string | null = null;
  let storagePaths: string[] = [];
  try {
    // Administrador TEMPORÁRIO: usuário criado pela API de administração, link mágico gerado (sem enviar e-mail) e
    // trocado por uma sessão. Tudo é apagado no fim.
    const created = await service.auth.admin.createUser({ email: tempEmail, email_confirm: true });
    if (created.error || !created.data.user) {
      report("administrador temporário", "falhou", errorText(created.error));
      return;
    }
    tempUserId = created.data.user.id;
    await service.from("admin_emails").upsert({ email: tempEmail }, { onConflict: "email" });
    const link = await service.auth.admin.generateLink({ type: "magiclink", email: tempEmail });
    const tokenHash = link.data?.properties?.hashed_token;
    if (link.error || !tokenHash) {
      report("sessão do administrador temporário", "falhou", errorText(link.error) || "sem token");
      return;
    }
    const admin = createClient(url, anonKey, opts);
    const session = await admin.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
    if (session.error || !session.data.session) {
      report("sessão do administrador temporário", "falhou", errorText(session.error));
      return;
    }
    report("administrador temporário com sessão (sem clicar em link)", "ok");

    const { analyzeImportText, executeImport } = await import("@/lib/admin/import-run");
    const analyzed = await analyzeImportText(admin, csv);
    if ("error" in analyzed) {
      report("validação do CSV", "falhou", analyzed.error);
      return;
    }
    const rows = analyzed.result.rows;
    report("validação do CSV de exemplo", rows.length === 3 && rows.every((row) => row.ok) ? "ok" : "falhou", rows.map((row) => (row.ok ? `${row.product.slug}: ${row.action}` : `linha ${row.line}: ${row.errors.join("; ")}`)).join(" | "));
    if (!rows.every((row) => row.ok)) return;

    const run = await executeImport(admin, csv);
    if (!run.ok) {
      report("gravação pelo importador", "falhou", run.message);
      return;
    }
    storagePaths = run.storagePaths;
    report("gravação pelo importador (uma transação)", run.created.length === 3 ? "ok" : "falhou", `criados: ${run.created.join(", ")}`);
    report("foto por URL (Unsplash) enviada ao Storage", run.imageProblems.length === 0 && run.storagePaths.length === 1 ? "ok" : "falhou", run.imageProblems.map((problem) => problem.errors.join("; ")).join(" | ") || `${run.storagePaths.length} arquivo(s)`);
    const again = await executeImport(admin, csv);
    report("importar de novo atualiza, não duplica", again.ok && again.updated.length === 3 && again.created.length === 0 ? "ok" : "falhou");
    storagePaths = [...new Set([...storagePaths, ...(again.ok ? again.storagePaths : [])])];

    // Custo e fornecedor: só na tabela privada.
    const priv = await service.from("product_private").select("cost_cents, supplier_shipping_cents, supplier_url, notes, products!inner(slug)").in("products.slug", SLUGS);
    const found = (priv.data ?? []).length;
    report("custo, frete e link do fornecedor gravados em product_private", !priv.error && found === 3 && (priv.data ?? []).every((row) => String(row.notes).includes(SENTINEL)) ? "ok" : "falhou", priv.error ? errorText(priv.error) : `${found} linha(s) privadas`);
    const publicRows = await anon.from("products").select("*, product_variants(*), product_images(*)").in("slug", SLUGS);
    const publicText = JSON.stringify(publicRows.data ?? []);
    const leaks = [SENTINEL, "PRIVADO-7f3a", "fornecedor-teste", "cost_cents", "supplier_url", "supplier_shipping_cents"].filter((needle) => publicText.includes(needle));
    report("resposta pública dos produtos (anon, select *) sem nada privado", !publicRows.error && (publicRows.data?.length ?? 0) === 3 && !leaks.length ? "ok" : "falhou", publicRows.error ? errorText(publicRows.error) : leaks.length ? `VAZOU: ${leaks.join(", ")}` : "3 produtos, nenhum campo privado");
    const direct = await anon.from("product_private").select("*").limit(1);
    report("product_private continua ilegível para o anon", direct.error || !direct.data?.length ? "ok" : "falhou");

    // Páginas do site local (se estiver no ar): nada privado no HTML.
    const site = process.env.SITE_URL_TESTE ?? "http://localhost:3000";
    try {
      const pages: string[] = [];
      for (const slug of SLUGS) {
        const response = await fetch(`${site}/produtos/${slug}`, { signal: AbortSignal.timeout(20_000) });
        if (response.ok) pages.push(await response.text());
      }
      if (!pages.length) report("páginas do site local sem dados privados", "pulado", `${site} não mostrou as páginas (site fora do ar ou cache de 60 s do catálogo: rode de novo em 1 minuto)`);
      else {
        const htmlLeaks = [SENTINEL, "PRIVADO-7f3a", "fornecedor-teste", "cost_cents", "supplier_url"].filter((needle) => pages.some((html) => html.includes(needle)));
        report("páginas do site local sem dados privados", htmlLeaks.length ? "falhou" : "ok", htmlLeaks.length ? `VAZOU: ${htmlLeaks.join(", ")}` : `${pages.length} página(s) conferidas em ${site}`);
      }
    } catch {
      report("páginas do site local sem dados privados", "pulado", `${site} não respondeu (suba o site com pnpm dev e rode de novo)`);
    }
  } catch (error) {
    report("importador", "falhou", error instanceof Error ? error.message : String(error));
  } finally {
    // Limpeza: produtos de teste (leva variantes, fotos e dados privados), arquivos do Storage, admin e usuário temporários.
    const del = await service.from("products").delete().in("slug", SLUGS);
    const leftover = await service.from("products").select("slug").in("slug", SLUGS);
    const leftPrivate = await service.from("product_private").select("notes").like("notes", `%${SENTINEL}%`);
    const leftVariants = await service.from("product_variants").select("sku").like("sku", "TESTE-IMPORTADOR-%");
    const listed = await service.storage.from("produtos").list("importados/teste-importador-bone");
    const allPaths = [...new Set([...storagePaths, ...(listed.data ?? []).map((file) => `importados/teste-importador-bone/${file.name}`)])];
    if (allPaths.length) await service.storage.from("produtos").remove(allPaths);
    await service.from("admin_emails").delete().eq("email", tempEmail);
    if (tempUserId) await service.auth.admin.deleteUser(tempUserId);
    const clean = !del.error && !leftover.data?.length && !leftPrivate.data?.length && !leftVariants.data?.length;
    report("limpeza: produtos de teste, dados privados, fotos e administrador temporário apagados", clean ? "ok" : "falhou", clean ? "" : "SOBROU algo; apague os produtos teste-importador-* no painel");
  }
}

// ---------------------------------------------------------------------------------------------------------------------
function summary() {
  const count = (status: Status) => results.filter((result) => result.status === status).length;
  console.log("\n──────────── Resumo ────────────");
  console.log(`  ✔ passaram: ${count("ok")}   ✖ falharam: ${count("falhou")}   ⚠ atenção: ${count("aviso")}   – pulados: ${count("pulado")}`);
  const failed = results.filter((result) => result.status === "falhou");
  if (failed.length) {
    console.log("\nO que falhou:");
    for (const item of failed) console.log(`  ✖ [${item.group.split(")")[0]}] ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
  }
  const warned = results.filter((result) => result.status === "aviso");
  if (warned.length) {
    console.log("\nAtenção:");
    for (const item of warned) console.log(`  ⚠ ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
  }
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => {
  console.error(`\n✖ O script parou por um erro inesperado: ${mask(error instanceof Error ? error.message : String(error))}`);
  process.exit(1);
});
