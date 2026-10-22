import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

// Banco simulado para os testes (PGlite = Postgres em memória) com os stubs do que o Supabase traz pronto: papéis
// anon/authenticated/service_role, auth.jwt() e o schema storage. NÃO é o Supabase real.
export const root = path.resolve(import.meta.dirname, "../..");
export const read = (file: string) => readFileSync(path.join(root, file), "utf8");
export const migrations = () => readdirSync(path.join(root, "supabase/migrations")).filter((file) => file.endsWith(".sql")).sort();

export async function createDb({ upTo, seed = true }: { upTo?: string; seed?: boolean } = {}) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
  `);
  for (const file of migrations()) {
    if (upTo && file.slice(0, 14) > upTo) continue;
    await db.exec(read(`supabase/migrations/${file}`));
  }
  if (seed) await db.exec(read("supabase/seed.sql"));
  return db;
}

/** Troca o papel (e o e-mail do JWT, para is_admin()). */
export async function asRole(db: PGlite, role: string, email?: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [email ? JSON.stringify({ email }) : ""]);
  await db.exec(`set role ${role}`);
}

export const orderPayload = (id: string, items: { sku: string; quantity: number }[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    id,
    customer: { name: "Maria Silva", email: "maria@exemplo.com", phone: "11999999999" },
    address: { street: "Rua A", number: "1", district: "Centro", city: "São Paulo", state: "SP", cep: "01000000" },
    shipping: { id: "economica", label: "Econômica", days: "Chega em 3 a 6 dias úteis", priceCents: 2490 },
    payment_method: "pix",
    items,
    ...extra,
  });
