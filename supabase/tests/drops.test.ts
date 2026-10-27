import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb, orderPayload } from "./db";

// Drops (loja extra, item 6) no banco simulado (PGlite): liberação pela data, limite por pedido, estoque como teto, lista
// de espera pública limitada e só admin lê. Drops de TESTE. Não testado no Supabase real.
let db: PGlite;
const create = (id: string, items: { sku: string; quantity: number }[]) => db.query("select * from create_order($1::jsonb)", [orderPayload(id, items, { payment_method: "cartao" })]);

beforeAll(async () => {
  db = await createDb();
  await asRole(db, "service_role");
  await db.exec(`
    update product_variants set stock = 3 where sku in ('APX-060-UN', 'APX-062-UN');
    update product_variants set stock = 50 where sku = 'APX-001-M';
    insert into drops (slug, title, launch_at, mode, per_order_limit, product_slugs) values
      ('futuro', 'Drop futuro', now() + interval '1 day', 'lancamento', null, array['bone-hamilton']),
      ('aberto', 'Drop aberto', now() - interval '1 hour', 'pre_venda', 2, array['poster-hamilton', 'scuderia-racing-jacket']);
  `);
}, 60_000);

describe("drops (banco simulado)", () => {
  it("antes do lançamento a create_order recusa e nada é gravado", async () => {
    await expect(create("D-1", [{ sku: "APX-060-UN", quantity: 1 }])).rejects.toThrow(/DROP_NAO_LIBERADO/);
    expect((await db.query("select 1 from orders where id = 'D-1'")).rows).toHaveLength(0);
    expect((await db.query<{ stock: number }>("select stock from product_variants where sku = 'APX-060-UN'")).rows[0].stock).toBe(3);
  });

  it("depois do lançamento abre sozinho (inclusive pela data mudada no painel)", async () => {
    await db.query("update drops set launch_at = now() - interval '1 minute' where slug = 'futuro'");
    await expect(create("D-2", [{ sku: "APX-060-UN", quantity: 1 }])).resolves.toBeTruthy();
  });

  it("limite por pedido soma as peças do mesmo drop; o estoque continua sendo o teto", async () => {
    await expect(create("D-3", [{ sku: "APX-062-UN", quantity: 1 }, { sku: "APX-001-M", quantity: 2 }])).rejects.toThrow(/DROP_LIMITE/);
    await expect(create("D-4", [{ sku: "APX-062-UN", quantity: 1 }, { sku: "APX-001-M", quantity: 1 }])).resolves.toBeTruthy();
    await db.query("update drops set per_order_limit = null where slug = 'aberto'");
    await expect(create("D-5", [{ sku: "APX-062-UN", quantity: 3 }])).rejects.toThrow(/ESTOQUE_INSUFICIENTE/);
  });

  it("drop inativo não trava a venda; público lê só os ativos", async () => {
    await db.query("update drops set active = false, launch_at = now() + interval '1 day' where slug = 'futuro'");
    await expect(create("D-6", [{ sku: "APX-060-UN", quantity: 1 }])).resolves.toBeTruthy();
    await asRole(db, "anon");
    expect((await db.query("select slug from drops")).rows).toEqual([{ slug: "aberto" }]);
    await asRole(db, "service_role");
  });

  it("lista de espera: público só insere (com consentimento, em drop ativo); só admin lê", async () => {
    const dropId = (await db.query<{ id: string }>("select id from drops where slug = 'aberto'")).rows[0].id;
    const inactive = (await db.query<{ id: string }>("select id from drops where slug = 'futuro'")).rows[0].id;
    await asRole(db, "anon");
    await db.query("insert into drop_waitlist (drop_id, email, consent, consent_text) values ($1, 'fa@exemplo.com', true, 'Quero ser avisado do lançamento.')", [dropId]);
    await expect(db.query("insert into drop_waitlist (drop_id, email, consent, consent_text) values ($1, 'x@exemplo.com', true, 'Quero ser avisado do lançamento.')", [inactive])).rejects.toThrow();
    await expect(db.query("insert into drop_waitlist (drop_id, email, consent, consent_text) values ($1, 'y@exemplo.com', false, 'Quero ser avisado do lançamento.')", [dropId])).rejects.toThrow();
    await expect(db.query("select * from drop_waitlist")).rejects.toThrow();
    await asRole(db, "service_role");
    expect((await db.query("select email from drop_waitlist")).rows).toEqual([{ email: "fa@exemplo.com" }]);
  });
});
