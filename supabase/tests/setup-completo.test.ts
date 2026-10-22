import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

// supabase/setup-completo.sql (gerado por `pnpm supabase:setup`): roda num Postgres limpo e RODA DE NOVO sem erro, com
// o catálogo completo e o modelo de venda preenchido. Stubs do que o Supabase já traz (papéis, auth.jwt, storage).
const root = path.resolve(import.meta.dirname, "../..");
// CRLF → LF: no Windows o git converte as quebras de linha da cópia local (core.autocrlf) e o teste compara com "\n".
const setup = readFileSync(path.join(root, "supabase/setup-completo.sql"), "utf8").replace(/\r\n/g, "\n");

describe("setup completo do Supabase", () => {
  it("está em dia: contém todas as migrations (rode `pnpm supabase:setup` depois de criar uma)", () => {
    for (const file of readdirSync(path.join(root, "supabase/migrations")).filter((name) => name.endsWith(".sql"))) expect(setup).toContain(`-- ${file}\n`);
  });

  it("cria tudo, é reexecutável e traz sob encomenda e estoque próprio", async () => {
    const db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create function auth.jwt() returns jsonb language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      create table storage.buckets (id text primary key, name text, public boolean);
      create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
    `);
    await db.exec(setup);
    await db.exec(setup); // segunda vez: nada pode falhar nem duplicar
    const count = (sql: string) => db.query<{ n: number }>(sql).then((result) => result.rows[0].n);
    expect(await count("select count(*)::int n from products")).toBe(66);
    expect(await count("select count(*)::int n from product_images")).toBeGreaterThanOrEqual(66);
    expect(await count("select count(*)::int n from products where fulfillment = 'sob_encomenda'")).toBeGreaterThan(0);
    expect(await count("select count(*)::int n from products where fulfillment = 'estoque_proprio'")).toBeGreaterThan(0);
    expect(await count("select count(*)::int n from products where fulfillment = 'sob_encomenda' and origin = 'importado' and dispatch_max_days >= 15")).toBeGreaterThan(0);
    expect(await count("select count(*)::int n from pg_policies where tablename = 'product_private'")).toBe(1);
    expect(await count("select count(*)::int n from pg_trigger where tgname = 'products_touch'")).toBe(1);
    expect(await count("select count(*)::int n from pg_constraint where conname = 'products_dispatch_range'")).toBe(1);
  }, 60_000);
});
