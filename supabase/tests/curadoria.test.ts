import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb, orderPayload } from "./db";

// Curadoria (colunas novas, seed, importador) e a função bestseller_slugs no banco simulado (PGlite).
// Não testado contra o Supabase real.
let db: PGlite;
const ADMIN = "admin@apex.test";

const order = async (id: string, items: { sku: string; quantity: number }[], status: string, isTest = false) => {
  await asRole(db, "service_role");
  await db.query("select create_order($1::jsonb)", [orderPayload(id, items)]);
  await db.exec("reset role");
  await db.query("update orders set status = $2, is_test = $3 where id = $1", [id, status, isTest]);
};
const slugs = async (role = "anon") => {
  await asRole(db, role);
  const rows = (await db.query<{ slug: string; place: number }>("select * from bestseller_slugs(90, 8)")).rows;
  await db.exec("reset role");
  return rows;
};

beforeAll(async () => {
  db = await createDb();
  await db.exec(`insert into admin_emails (email) values ('${ADMIN}'); update product_variants set stock = 100;`);
}, 60_000);

describe("curadoria no banco", () => {
  it("o seed grava os mais vendidos manuais (com ordem) e o 'novo até'", async () => {
    const rows = (await db.query<{ slug: string; bestseller_rank: number }>("select slug, bestseller_rank from products where bestseller_manual order by bestseller_rank")).rows;
    expect(rows.map((row) => row.slug)).toEqual(["camiseta-hamilton", "scuderia-racing-jacket", "bone-ferrari", "camiseta-bortoleto"]);
    const until = (await db.query<{ new_until: string }>("select new_until::text from products where slug = 'poster-bortoleto'")).rows[0];
    expect(until.new_until).toBe("2026-12-31");
  });

  it("a ordem só aceita 1 a 9999", async () => {
    await expect(db.query("update products set bestseller_rank = 0 where slug = 'bone-ferrari'")).rejects.toThrow(/check/);
  });
});

describe("bestseller_slugs", () => {
  it("só pedidos pagos/enviados/entregues dos últimos 90 dias, sem testes; ordem por quantidade; sem contagens", async () => {
    // APX-002 = ferrari-team-cap (tamanho único), APX-001 = scuderia-racing-jacket
    await order("BS-1", [{ sku: "APX-002-UN", quantity: 3 }], "pago");
    await order("BS-2", [{ sku: "APX-001-M", quantity: 1 }], "entregue");
    await order("BS-3", [{ sku: "APX-001-G", quantity: 1 }], "enviado");
    await order("BS-4", [{ sku: "APX-003-M", quantity: 9 }], "aguardando-pagamento"); // não pago: fora
    await order("BS-5", [{ sku: "APX-004-M", quantity: 9 }], "pago", true); // pedido de teste: fora
    await order("BS-6", [{ sku: "APX-005-M", quantity: 9 }], "pago");
    await db.exec("update orders set created_at = now() - interval '120 days' where id = 'BS-6'"); // antigo: fora
    const rows = await slugs();
    expect(rows).toEqual([
      { slug: "ferrari-team-cap", place: 1 },
      { slug: "scuderia-racing-jacket", place: 2 },
    ]);
    expect(Object.keys(rows[0]).sort()).toEqual(["place", "slug"]); // nada de quantidade
  });

  it("produto que deixou de ser ativo some da lista", async () => {
    await db.exec("update products set status = 'archived' where slug = 'ferrari-team-cap'");
    expect((await slugs()).map((row) => row.slug)).toEqual(["scuderia-racing-jacket"]);
    await db.exec("update products set status = 'active' where slug = 'ferrari-team-cap'");
  });

  it("o visitante executa a função, mas continua sem ler pedidos", async () => {
    await asRole(db, "anon");
    expect((await db.query<{ n: number }>("select count(*)::int n from orders")).rows[0].n).toBe(0);
    await db.exec("reset role");
  });
});

describe("importador com curadoria", () => {
  const item = (extra: Record<string, unknown>) =>
    JSON.stringify([
      {
        slug: "teste-curadoria", name: "Teste curadoria", description: "Produto de teste da curadoria.", category_slug: "acessorios",
        team_slug: "", driver_slug: "", price_cents: 5000, compare_at_price_cents: null, tags: [], status: "active",
        fulfillment: "estoque_proprio", dispatch_min_days: 1, dispatch_max_days: 2, origin: "nacional", weight_grams: 100,
        length_cm: 10, width_cm: 10, height_cm: 10, variants: [{ sku: "TESTE-CURADORIA-UN", size: "Único", stock: 1 }], images: null, private: {},
        ...extra,
      },
    ]);
  const row = async () => (await db.query<{ featured: boolean; bestseller_manual: boolean; bestseller_rank: number | null; new_until: string | null }>("select featured, bestseller_manual, bestseller_rank, new_until::text from products where slug = 'teste-curadoria'")).rows[0];

  it("grava na criação e mantém o que a planilha não trouxe na atualização", async () => {
    await asRole(db, "authenticated", ADMIN);
    await db.query("select import_products($1::jsonb)", [item({ featured: true, bestseller_manual: true, bestseller_rank: 7, new_until: "2026-11-30" })]);
    expect(await row()).toEqual({ featured: true, bestseller_manual: true, bestseller_rank: 7, new_until: "2026-11-30" });
    await db.query("select import_products($1::jsonb)", [item({ bestseller_rank: null })]);
    expect(await row()).toEqual({ featured: true, bestseller_manual: true, bestseller_rank: null, new_until: "2026-11-30" });
    await db.exec("reset role");
  });
});
