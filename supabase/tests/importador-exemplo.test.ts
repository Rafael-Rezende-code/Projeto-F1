import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { analyzeImportText, executeImport } from "@/lib/admin/import-run";
import { productFromRow } from "@/lib/catalog/supabase-mapping";

vi.mock("server-only", () => ({}));

// O CSV de exemplo (docs/modelos/produtos-exemplo.csv) passando pela CAMADA DE CÓDIGO do importador (lib/admin/import-run.ts,
// a mesma que o painel e o scripts/supabase/ativar.ts usam) contra o schema real (migrations + seed) num Postgres em memória
// (PGlite), sem login: o "cliente Supabase" abaixo só traduz as poucas chamadas que o importador faz para SQL, sob o papel
// de um administrador. Confere custo e fornecedor só na tabela privada, nada nas respostas públicas, a baixa de estoque com
// o caso de estoque insuficiente e a limpeza dos produtos de teste. NÃO prova o PostgREST/Storage reais (isso é o
// `pnpm supabase:ativar` contra o projeto de verdade).
const root = path.resolve(import.meta.dirname, "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const db = new PGlite();
const ADMIN = "dono@loja.com";
const SENTINEL = "NOTA-PRIVADA-TESTE-7f3a";
const SLUGS = ["teste-importador-camiseta", "teste-importador-miniatura", "teste-importador-bone"];

const asRole = async (role: string, email?: string) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [email ? JSON.stringify({ email }) : ""]);
  await db.exec(`set role ${role}`);
};

const uploads: string[] = [];
// Cliente Supabase mínimo: só o que analyzeImportText/executeImport usam.
const client = {
  from: (table: string) => {
    const run = async () => {
      const sql =
        table === "products"
          ? "select p.id, p.slug, coalesce((select json_agg(json_build_object('sku', v.sku, 'size', v.size)) from product_variants v where v.product_id = p.id), '[]'::json) as product_variants from products p"
          : `select * from ${table}`;
      return { data: (await db.query(sql)).rows, error: null };
    };
    return { select: () => ({ limit: () => run(), then: (resolve: (value: unknown) => void) => run().then(resolve) }) };
  },
  rpc: async (name: string, args: { p_items: unknown }) => {
    try {
      const { rows } = await db.query<{ r: unknown }>(`select ${name}($1::jsonb) as r`, [JSON.stringify(args.p_items)]);
      return { data: rows[0].r, error: null };
    } catch (error) {
      const e = error as { message: string; detail?: string };
      return { data: null, error: { message: e.message, details: e.detail ?? "" } };
    }
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (file: string) => {
        uploads.push(file);
        return { error: null };
      },
      getPublicUrl: (file: string) => ({ data: { publicUrl: `https://projeto.supabase.co/storage/v1/object/public/${bucket}/${file}` } }),
    }),
  },
} as never;

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
  await db.exec(read("supabase/migrations/20261023000000_modelo_de_venda.sql"));
  await db.exec(read("supabase/migrations/20261024000000_importador.sql"));
  await db.exec(read("supabase/seed.sql"));
  await db.exec(`insert into admin_emails values ('${ADMIN}')`);
  // As fotos vêm de images.unsplash.com: no teste, a rede devolve um PNG pequeno.
  const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#c33" } }).png().toBuffer();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(png, { headers: { "content-type": "image/png" } })));
}, 60_000);
afterAll(() => vi.unstubAllGlobals());

const csv = read("docs/modelos/produtos-exemplo.csv");

describe("CSV de exemplo pelo importador (camada de código, sem login)", () => {
  it("validação: 3 produtos novos, sem erros", async () => {
    await asRole("authenticated", ADMIN);
    const analyzed = await analyzeImportText(client, csv);
    if ("error" in analyzed) throw new Error(analyzed.error);
    expect(analyzed.result.rows).toHaveLength(3);
    expect(analyzed.result.rows.every((row) => row.ok && row.action === "novo")).toBe(true);
    const models = analyzed.result.rows.map((row) => (row.ok ? [row.product.slug, row.product.fulfillment, row.product.imageUrls.length] : null));
    expect(models).toEqual([
      ["teste-importador-camiseta", "estoque_proprio", 0],
      ["teste-importador-miniatura", "sob_encomenda", 0],
      ["teste-importador-bone", "estoque_proprio", 1],
    ]);
  });

  it("gravação: cria os 3, com a foto da URL guardada no Storage", async () => {
    await asRole("authenticated", ADMIN);
    const report = await executeImport(client, csv);
    expect(report).toMatchObject({ ok: true, created: SLUGS, updated: [], skipped: [], imageProblems: [] });
    expect(uploads).toHaveLength(1);
    // De novo: o slug existe, então atualiza (idempotente), sem duplicar.
    const again = await executeImport(client, csv);
    expect(again).toMatchObject({ ok: true, created: [], updated: SLUGS });
    await db.exec("reset role");
    expect((await db.query<{ n: number }>("select count(*)::int n from products where slug like 'teste-importador-%'")).rows[0].n).toBe(3);
  });

  it("custo e fornecedor ficam só na tabela privada", async () => {
    await db.exec("reset role");
    const rows = (await db.query<{ slug: string; cost_cents: number; supplier_shipping_cents: number | null; supplier_url: string | null; notes: string }>(
      "select p.slug, pp.* from product_private pp join products p on p.id = pp.product_id where p.slug like 'teste-importador-%' order by p.slug",
    )).rows;
    expect(rows.map((row) => [row.slug, row.cost_cents, row.supplier_shipping_cents])).toEqual([
      ["teste-importador-bone", 2900, null],
      ["teste-importador-camiseta", 4713, null],
      ["teste-importador-miniatura", 41200, 3850],
    ]);
    expect(rows.every((row) => row.notes.includes(SENTINEL))).toBe(true);
    expect(rows.find((row) => row.slug === "teste-importador-miniatura")!.supplier_url).toBe("https://fornecedor-teste.example.com/produto/PRIVADO-7f3a");
  });

  it("respostas públicas: nada de custo, fornecedor ou nota (banco e mapeamento do catálogo)", async () => {
    await asRole("anon");
    await expect(db.query("select * from product_private")).rejects.toThrow("permission denied");
    const result = await db.query<Record<string, unknown>>(
      "select p.*, (select json_agg(v) from product_variants v where v.product_id = p.id) as product_variants, (select json_agg(i) from product_images i where i.product_id = p.id) as product_images from products p where p.slug like 'teste-importador-%' order by p.slug",
    );
    expect(result.rows).toHaveLength(3);
    const text = JSON.stringify(result.rows);
    for (const secret of [SENTINEL, "PRIVADO-7f3a", "fornecedor-teste", "cost_cents", "supplier_url", "supplier_shipping_cents"]) expect(text).not.toContain(secret);
    // O que a loja monta a partir dessas linhas (lib/catalog/supabase-mapping.ts) também não tem nada privado.
    const mapped = JSON.stringify(result.rows.map((row) => productFromRow(row as never)));
    for (const secret of [SENTINEL, "PRIVADO-7f3a", "cost", "supplier", "fornecedor"]) expect(mapped.toLowerCase()).not.toContain(secret.toLowerCase());
  });

  it("estoque: baixa de 1 unidade, estoque insuficiente não grava nada e a devolução restaura", async () => {
    const order = (id: string, quantity: number) =>
      JSON.stringify({
        id, customer: { name: "Teste Apex", email: "teste-apex@example.invalid", phone: "11999999999" },
        address: { street: "Rua A", number: "1", district: "Centro", city: "São Paulo", state: "SP", cep: "01000000" },
        shipping: { id: "economica", label: "Econômica", days: "7 a 10 dias úteis", priceCents: 0 },
        payment_method: "pix", items: [{ sku: "TESTE-IMPORTADOR-CAMISETA-M", quantity }],
      });
    const stock = async () => (await db.query<{ stock: number }>("select stock from product_variants where sku = 'TESTE-IMPORTADOR-CAMISETA-M'")).rows[0].stock;
    await asRole("service_role");
    const before = await stock();
    expect(before).toBe(5);
    const created = await db.query<{ total_cents: number }>("select * from create_order($1::jsonb)", [order("APX-TESTE-IMP", 1)]);
    expect(created.rows[0].total_cents).toBe(12990);
    expect(await stock()).toBe(4);
    await expect(db.query("select * from create_order($1::jsonb)", [order("APX-TESTE-IMP-2", 99)])).rejects.toThrow("ESTOQUE_INSUFICIENTE");
    expect(await stock()).toBe(4);
    expect((await db.query<{ r: boolean }>("select release_order_stock('APX-TESTE-IMP') r")).rows[0].r).toBe(true);
    expect(await stock()).toBe(5);
  });

  it("limpeza: apagar os produtos de teste leva junto variantes, fotos e dados privados", async () => {
    await db.exec("reset role");
    await db.exec("delete from order_items where order_id like 'APX-TESTE-IMP%'; delete from orders where id like 'APX-TESTE-IMP%'; delete from customers where email = 'teste-apex@example.invalid'");
    await db.exec("delete from products where slug like 'teste-importador-%'");
    const left = (await db.query<{ n: number }>(
      "select (select count(*) from products where slug like 'teste-importador-%') + (select count(*) from product_variants where sku like 'TESTE-IMPORTADOR-%') + (select count(*) from product_private where notes like '%NOTA-PRIVADA-TESTE%') as n",
    )).rows[0].n;
    expect(Number(left)).toBe(0);
  });
});
