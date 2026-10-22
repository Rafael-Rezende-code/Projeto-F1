import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

// Testa a migração (supabase/migrations) e o seed (supabase/seed.sql, gerado por `pnpm supabase:seed`) num Postgres
// em memória (PGlite), com stubs do que o Supabase traz pronto (papéis anon/authenticated/service_role, auth.jwt() e o
// schema storage). Cobre: baixa de estoque transacional, venda acima do estoque, devolução idempotente e RLS.
const root = path.resolve(import.meta.dirname, "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const db = new PGlite();

const order = (id: string, items: { sku: string; quantity: number }[]) =>
  JSON.stringify({
    id,
    customer: { name: "Maria Silva", email: "Maria@Exemplo.com", phone: "11999999999" },
    address: { street: "Rua A", number: "1", district: "Centro", city: "São Paulo", state: "SP", cep: "01000000" },
    shipping: { id: "economica", label: "Econômica", days: "7 a 10 dias úteis", priceCents: 2490 },
    payment_method: "pix",
    items,
  });
const stock = async (sku: string) => (await db.query<{ stock: number }>("select stock from product_variants where sku = $1", [sku])).rows[0].stock;
const asRole = async (role: string, email?: string) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [email ? JSON.stringify({ email }) : ""]);
  await db.exec(`set role ${role}`);
};

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
  `);
  await db.exec(read("supabase/migrations/20261022000000_loja.sql"));
  // Como no Supabase: os papéis recebem permissão nas tabelas por padrão (o RLS é que filtra). A product_private é
  // criada DEPOIS do grant geral e revoga o anon por conta própria; o grant abaixo reproduz o default do Supabase.
  await db.exec("grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;");
  await db.exec("alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;");
  await db.exec(read("supabase/migrations/20261023000000_modelo_de_venda.sql"));
  await db.exec(read("supabase/migrations/20261024000000_importador.sql"));
  await db.exec(read("supabase/seed.sql"));
}, 60_000);

describe("banco da loja (migração + seed)", () => {
  it("seed completo e idempotente", async () => {
    const count = async () => (await db.query<{ p: number; i: number }>("select (select count(*)::int from products) p, (select count(*)::int from product_images) i")).rows[0];
    const first = await count();
    expect(first.p).toBe(66);
    await db.exec(read("supabase/seed.sql"));
    expect(await count()).toEqual(first);
  });

  it("create_order baixa o estoque e calcula o total pelo banco", async () => {
    await asRole("service_role");
    const before = await stock("APX-001-M");
    const { rows } = await db.query<{ subtotal_cents: number; total_cents: number; status: string }>("select * from create_order($1::jsonb)", [order("APX-T1", [{ sku: "APX-001-M", quantity: 2 }])]);
    expect(await stock("APX-001-M")).toBe(before - 2);
    expect(rows[0].subtotal_cents).toBe(2 * 64990);
    expect(rows[0].total_cents).toBe(2 * 64990 + 2490);
    expect(rows[0].status).toBe("aguardando-pagamento");
  });

  it("nunca vende acima do estoque (e não grava nada)", async () => {
    await asRole("service_role");
    const before = await stock("APX-001-M");
    const available = await stock("APX-001-GG");
    await expect(db.query("select * from create_order($1::jsonb)", [order("APX-T2", [{ sku: "APX-001-M", quantity: 1 }, { sku: "APX-001-GG", quantity: available + 1 }])])).rejects.toThrow("ESTOQUE_INSUFICIENTE");
    expect(await stock("APX-001-M")).toBe(before);
    expect((await db.query<{ n: number }>("select count(*)::int n from orders where id = 'APX-T2'")).rows[0].n).toBe(0);
  });

  it("devolve o estoque uma vez só", async () => {
    await asRole("service_role");
    const before = await stock("APX-001-M");
    expect((await db.query<{ r: boolean }>("select release_order_stock('APX-T1') r")).rows[0].r).toBe(true);
    expect((await db.query<{ r: boolean }>("select release_order_stock('APX-T1') r")).rows[0].r).toBe(false);
    expect(await stock("APX-001-M")).toBe(before + 2);
  });

  it("RLS: visitante lê só o catálogo ativo, não escreve e não cria pedidos", async () => {
    await asRole("postgres");
    await db.exec("reset role; update products set status = 'draft' where code = 'APX-003'");
    await asRole("anon");
    expect((await db.query<{ n: number }>("select count(*)::int n from products where code = 'APX-003'")).rows[0].n).toBe(0);
    expect((await db.query<{ n: number }>("select count(*)::int n from orders")).rows[0].n).toBe(0);
    await db.query("update products set price_cents = 1");
    await expect(db.query("select * from create_order($1::jsonb)", [order("APX-T3", [{ sku: "APX-001-M", quantity: 1 }])])).rejects.toThrow("permission denied");
    await db.exec("reset role");
    expect((await db.query<{ n: number }>("select count(*)::int n from products where price_cents = 1")).rows[0].n).toBe(0);
  });

  it("RLS: só e-mails de admin_emails editam e veem pedidos e rascunhos", async () => {
    await db.exec("reset role; insert into admin_emails values ('dono@loja.com')");
    await asRole("authenticated", "Dono@Loja.com");
    expect((await db.query<{ n: number }>("select count(*)::int n from products where code = 'APX-003'")).rows[0].n).toBe(1);
    expect((await db.query<{ n: number }>("select count(*)::int n from orders")).rows[0].n).toBe(1);
    await db.query("update products set price_cents = 12345 where code = 'APX-002'");
    await asRole("authenticated", "outro@x.com");
    expect((await db.query<{ n: number }>("select count(*)::int n from orders")).rows[0].n).toBe(0);
    await db.query("update products set price_cents = 1 where code = 'APX-002'");
    await db.exec("reset role");
    expect((await db.query<{ p: number }>("select price_cents p from products where code = 'APX-002'")).rows[0].p).toBe(12345);
  });

  it("modelo de venda: cada item leva o modelo do produto e começa no status certo", async () => {
    await db.exec("reset role");
    const madeToOrder = (await db.query<{ sku: string }>("select v.sku from product_variants v join products p on p.id = v.product_id where p.fulfillment = 'sob_encomenda' and v.stock > 0 limit 1")).rows[0].sku;
    await asRole("service_role");
    await db.query("select * from create_order($1::jsonb)", [order("APX-T4", [{ sku: "APX-001-M", quantity: 1 }, { sku: madeToOrder, quantity: 1 }])]);
    const { rows } = await db.query<{ sku: string; fulfillment: string; item_status: string; dispatch_max_days: number }>("select sku, fulfillment, item_status, dispatch_max_days from order_items where order_id = 'APX-T4' order by sku");
    const own = rows.find((row) => row.sku === "APX-001-M")!;
    const ordered = rows.find((row) => row.sku === madeToOrder)!;
    expect(own).toMatchObject({ fulfillment: "estoque_proprio", item_status: "separando" });
    expect(ordered).toMatchObject({ fulfillment: "sob_encomenda", item_status: "aguardando-compra" });
    expect(ordered.dispatch_max_days).toBeGreaterThan(own.dispatch_max_days);
  });

  it("dados privados (custo, fornecedor, notas): só admin; nunca no catálogo público", async () => {
    await db.exec("reset role");
    await db.exec("insert into product_private (product_id, cost_cents, supplier_url, notes) select id, 12300, 'https://fornecedor.exemplo/item-secreto', 'nota interna' from products where code = 'APX-001'");
    // Nenhuma coluna privada na tabela pública.
    const columns = (await db.query<{ column_name: string }>("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'products'")).rows.map((row) => row.column_name);
    for (const secret of ["cost_cents", "supplier_url", "supplier_shipping_cents", "notes"]) expect(columns).not.toContain(secret);
    // Visitante: sem permissão nenhuma na tabela; e o "select *" público do catálogo não traz nada privado.
    await asRole("anon");
    await expect(db.query("select * from product_private")).rejects.toThrow("permission denied");
    const publicRow = JSON.stringify((await db.query("select p.*, (select json_agg(v) from product_variants v where v.product_id = p.id) from products p where code = 'APX-001'")).rows);
    expect(publicRow).not.toContain("12300");
    expect(publicRow).not.toContain("fornecedor.exemplo");
    // Logado sem ser admin: zero linhas, e não escreve.
    await asRole("authenticated", "outro@x.com");
    expect((await db.query<{ n: number }>("select count(*)::int n from product_private")).rows[0].n).toBe(0);
    await db.query("update product_private set cost_cents = 1");
    await expect(db.query("insert into product_private (product_id, cost_cents) select id, 1 from products where code = 'APX-002'")).rejects.toThrow();
    // Admin lê e edita.
    await asRole("authenticated", "dono@loja.com");
    expect((await db.query<{ c: number }>("select cost_cents c from product_private")).rows[0].c).toBe(12300);
    await db.query("update order_items set item_status = 'comprado', supplier_tracking_code = 'LB123' where order_id = 'APX-T4' and item_status = 'aguardando-compra'");
    await db.exec("reset role");
    expect((await db.query<{ n: number }>("select count(*)::int n from order_items where supplier_tracking_code = 'LB123'")).rows[0].n).toBe(1);
  });

  it("importador: lote numa transação, slug existente atualiza, privados na tabela privada, só admin", async () => {
    const item = (slug: string, extra: Record<string, unknown> = {}) => ({
      slug, name: `Produto ${slug}`, description: "Descrição importada.", category_slug: "colecionaveis", team_slug: "", driver_slug: "hamilton",
      price_cents: 129990, compare_at_price_cents: null, tags: ["importado"], status: "active", fulfillment: "sob_encomenda",
      dispatch_min_days: 15, dispatch_max_days: 30, origin: "importado", weight_grams: 900, length_cm: 20, width_cm: 20, height_cm: 20,
      variants: [{ sku: `${slug.toUpperCase()}-UN`, size: "Único", stock: 3 }],
      images: [{ src: "https://x.supabase.co/storage/v1/object/public/produtos/importados/a.webp", alt: "", storage_path: "importados/a.webp" }],
      private: { cost_cents: 64000, supplier_url: "https://fornecedor.exemplo/p/1" },
      ...extra,
    });
    const run = (items: unknown[]) => db.query<{ r: { slug: string; action: string }[] }>("select import_products($1::jsonb) r", [JSON.stringify(items)]);
    // Visitante e usuário comum: sem permissão.
    await asRole("anon");
    await expect(run([item("imp-a")])).rejects.toThrow(/permission denied/);
    await asRole("authenticated", "outro@x.com");
    await expect(run([item("imp-a")])).rejects.toThrow("SEM_PERMISSAO");
    // Admin: cria dois.
    await asRole("authenticated", "dono@loja.com");
    expect((await run([item("imp-a"), item("imp-b")])).rows[0].r.map((row) => row.action)).toEqual(["criado", "criado"]);
    // Lote com erro no meio (SKU de outro produto): NADA é gravado, nem o primeiro.
    await expect(run([item("imp-c"), item("imp-d", { variants: [{ sku: "IMP-A-UN", size: "Único", stock: 1 }] })])).rejects.toThrow("SKU_DE_OUTRO_PRODUTO");
    await db.exec("reset role");
    expect((await db.query<{ n: number }>("select count(*)::int n from products where slug = 'imp-c'")).rows[0].n).toBe(0);
    // Slug existente atualiza; private sem custo mantém o custo; images null mantém as fotos.
    await asRole("authenticated", "dono@loja.com");
    const update = await run([item("imp-a", { name: "Produto A v2", price_cents: 99990, images: null, private: { notes: "nota" }, variants: [{ sku: "IMP-A-UN", size: "Único", stock: 7 }] })]);
    expect(update.rows[0].r[0].action).toBe("atualizado");
    await db.exec("reset role");
    const row = (await db.query<{ name: string; price_cents: number; cost_cents: number; notes: string; images: number; stock: number }>(
      "select p.name, p.price_cents, pp.cost_cents, pp.notes, (select count(*)::int from product_images i where i.product_id = p.id) images, (select stock from product_variants v where v.product_id = p.id) stock from products p join product_private pp on pp.product_id = p.id where p.slug = 'imp-a'",
    )).rows[0];
    expect(row).toEqual({ name: "Produto A v2", price_cents: 99990, cost_cents: 64000, notes: "nota", images: 1, stock: 7 });
    // Nada privado na tabela pública.
    await asRole("anon");
    expect(JSON.stringify((await db.query("select * from products where slug = 'imp-a'")).rows)).not.toContain("fornecedor.exemplo");
    await db.exec("reset role");
  });
});
