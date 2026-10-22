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
  await db.exec("grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;");
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
});
