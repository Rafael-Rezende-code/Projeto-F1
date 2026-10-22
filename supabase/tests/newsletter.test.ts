import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

// Migração da newsletter (supabase/migrations/20261025000000_newsletter.sql) num Postgres em memória: inscrição pública
// LIMITADA (só inserir, com consentimento, nas colunas liberadas), limites por IP e total, leitura só admin.
const root = path.resolve(import.meta.dirname, "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const db = new PGlite();
const asRole = async (role: string, email?: string) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [email ? JSON.stringify({ email }) : ""]);
  await db.exec(`set role ${role}`);
};
const CONSENT = "Quero receber novidades e lançamentos da Apex por e-mail. Usaremos seu e-mail somente para isso.";
const subscribe = (email: string, extra: Record<string, unknown> = {}) => {
  const row = { email, consent: true, consent_text: CONSENT, source: "home", ip_hash: null as string | null, ...extra };
  return db.query("insert into newsletter_subscribers (email, consent, consent_text, source, ip_hash) values ($1, $2, $3, $4, $5)", [row.email, row.consent, row.consent_text, row.source, row.ip_hash]);
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
  await db.exec("alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;");
  await db.exec(read("supabase/migrations/20261025000000_newsletter.sql"));
  await db.exec("insert into admin_emails values ('dono@loja.com')");
}, 60_000);

describe("newsletter (banco)", () => {
  it("o visitante (anon) se inscreve com consentimento e o e-mail fica em minúsculas", async () => {
    await asRole("anon");
    await subscribe("ana@exemplo.com");
    await expect(subscribe("Maiuscula@Exemplo.com")).rejects.toThrow(); // check email = lower(email)
  });

  it("recusa sem consentimento, e-mail inválido e consent_text curto", async () => {
    await asRole("anon");
    await expect(subscribe("sem@consent.com", { consent: false })).rejects.toThrow();
    await expect(subscribe("invalido", {})).rejects.toThrow();
    await expect(subscribe("curto@exemplo.com", { consent_text: "ok" })).rejects.toThrow();
  });

  it("e-mail repetido é recusado (unique); o app responde 'ok' do mesmo jeito", async () => {
    await asRole("anon");
    await expect(subscribe("ana@exemplo.com")).rejects.toThrow(/duplicate key|unique/);
  });

  it("o visitante NÃO lê, NÃO altera, NÃO apaga e NÃO escolhe colunas além das 5 liberadas", async () => {
    await asRole("anon");
    await expect(db.query("select * from newsletter_subscribers")).rejects.toThrow("permission denied");
    await expect(db.query("update newsletter_subscribers set unsubscribed_at = now()")).rejects.toThrow("permission denied");
    await expect(db.query("delete from newsletter_subscribers")).rejects.toThrow("permission denied");
    await expect(db.query("insert into newsletter_subscribers (email, consent, consent_text, created_at) values ('x@exemplo.com', true, $1, '2000-01-01')", [CONSENT])).rejects.toThrow("permission denied");
    await expect(db.query("insert into newsletter_subscribers (email, consent, consent_text, unsubscribed_at) values ('y@exemplo.com', true, $1, now())", [CONSENT])).rejects.toThrow("permission denied");
  });

  it("limite por IP: a 6ª inscrição do mesmo hash na hora é recusada; outro IP passa", async () => {
    await asRole("anon");
    const ip = "a".repeat(64);
    for (let i = 1; i <= 5; i++) await subscribe(`ip${i}@exemplo.com`, { ip_hash: ip });
    await expect(subscribe("ip6@exemplo.com", { ip_hash: ip })).rejects.toThrow("LIMITE_POR_IP");
    await subscribe("outro-ip@exemplo.com", { ip_hash: "b".repeat(64) });
  });

  it("limite total: 300 por hora no conjunto", async () => {
    await db.exec("reset role");
    await db.exec("insert into newsletter_subscribers (email, consent, consent_text) select 'massa' || g || '@exemplo.com', true, '" + CONSENT + "' from generate_series(1, 293) g"); // 7 inscrições anteriores + 293 = 300 na última hora
    await asRole("anon");
    await expect(subscribe("depois-do-limite@exemplo.com")).rejects.toThrow("LIMITE_GLOBAL");
  });

  it("só administrador lê, altera e apaga (RLS + is_admin)", async () => {
    await asRole("authenticated", "outro@x.com");
    expect((await db.query<{ n: number }>("select count(*)::int n from newsletter_subscribers")).rows[0].n).toBe(0);
    await db.query("update newsletter_subscribers set unsubscribed_at = now()");
    await db.query("delete from newsletter_subscribers where email = 'ana@exemplo.com'");
    await asRole("authenticated", "dono@loja.com");
    expect((await db.query<{ n: number }>("select count(*)::int n from newsletter_subscribers")).rows[0].n).toBe(300);
    await db.query("update newsletter_subscribers set unsubscribed_at = now() where email = 'ana@exemplo.com'");
    expect((await db.query<{ u: string | null }>("select unsubscribed_at u from newsletter_subscribers where email = 'ana@exemplo.com'")).rows[0].u).not.toBeNull();
    await db.query("delete from newsletter_subscribers where email like 'massa%'");
    await db.exec("reset role");
    expect((await db.query<{ n: number }>("select count(*)::int n from newsletter_subscribers where email like 'massa%'")).rows[0].n).toBe(0);
    // alterações de quem não é admin não tiveram efeito
    expect((await db.query<{ n: number }>("select count(*)::int n from newsletter_subscribers where email = 'ana@exemplo.com' and unsubscribed_at is not null")).rows[0].n).toBe(1);
  });
});
