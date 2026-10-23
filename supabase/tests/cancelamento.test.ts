import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb, orderPayload } from "./db";

// Histórico, cancelamento (estoque e cupom devolvidos numa transação), reembolso manual, pedidos de teste e indicadores
// do painel, no banco simulado (PGlite). Não testado contra o Supabase real.
let db: PGlite;
const ADMIN = "admin@apex.test";
const SKU = "APX-001-M";
const stock = async () => (await db.query<{ stock: number }>("select stock from product_variants where sku = $1", [SKU])).rows[0].stock;
const events = async (id: string) => (await db.query<{ kind: string; actor: string; message: string }>("select kind, actor, message from order_events where order_id = $1 order by id", [id])).rows;
const create = async (id: string, extra: Record<string, unknown> = {}, quantity = 1) => {
  await asRole(db, "service_role");
  await db.query("select create_order($1::jsonb)", [orderPayload(id, [{ sku: SKU, quantity }], extra)]);
  await db.exec("reset role");
};

beforeAll(async () => {
  db = await createDb();
  await db.exec(`
    insert into admin_emails (email) values ('${ADMIN}');
    update product_variants set stock = 50 where sku = '${SKU}';
    insert into coupons (code, kind, value, max_uses) values ('VOLTA', 'percentual', 10, 1);
  `);
}, 60_000);

describe("histórico do pedido", () => {
  it("registra criação, status, rastreio e item, com quem fez", async () => {
    await create("EV-1");
    await asRole(db, "authenticated", ADMIN);
    await db.exec("update orders set status = 'pago' where id = 'EV-1'");
    await db.exec("update order_items set item_status = 'enviado' where order_id = 'EV-1'");
    await db.exec("update orders set status = 'enviado', tracking_code = 'BR1' where id = 'EV-1'");
    await db.exec("reset role");
    const list = await events("EV-1");
    expect(list.map((e) => e.kind)).toEqual(["criado", "status", "item", "status", "rastreio"]);
    expect(list[0].actor).toBe("sistema");
    expect(list[1].actor).toBe(ADMIN);
  });

  it("visitante e usuário comum não leem nem gravam eventos", async () => {
    for (const [role, email] of [["anon", undefined], ["authenticated", "cliente@exemplo.com"]] as const) {
      await asRole(db, role, email);
      const rows = await db.query("select * from order_events").catch((error: Error) => error);
      expect(rows instanceof Error ? rows.message : (rows as { rows: unknown[] }).rows.length).toSatisfy((v: unknown) => v === 0 || /permission denied/.test(String(v)));
      await expect(db.query("insert into order_events (order_id, kind, message) values ('EV-1', 'nota', 'x')")).rejects.toThrow(/permission denied|row-level security/);
      await expect(db.query("select log_order_event('EV-1', 'nota', 'x')")).rejects.toThrow(/permission denied/);
    }
    await db.exec("reset role");
  });
});

describe("cancel_order", () => {
  it("cancela, devolve estoque e o uso do cupom numa transação; repetir não devolve de novo", async () => {
    const before = await stock();
    await create("CA-1", { coupon: "VOLTA" }, 2);
    expect(await stock()).toBe(before - 2);
    expect((await db.query<{ uses: number }>("select uses from coupons where code = 'VOLTA'")).rows[0].uses).toBe(1);
    await asRole(db, "authenticated", ADMIN);
    const row = (await db.query<{ status: string; cancel_reason: string }>("select * from cancel_order('CA-1', 'Cliente desistiu')")).rows[0];
    expect(row).toMatchObject({ status: "cancelado", cancel_reason: "Cliente desistiu" });
    await db.query("select cancel_order('CA-1', 'De novo')");
    await db.exec("reset role");
    expect(await stock()).toBe(before);
    expect((await db.query<{ uses: number }>("select uses from coupons where code = 'VOLTA'")).rows[0].uses).toBe(0);
    expect((await events("CA-1")).filter((e) => e.kind === "cancelado")).toHaveLength(1);
  });

  it("pedido enviado exige confirmação explícita; motivo obrigatório", async () => {
    await create("CA-2");
    await db.exec("update orders set status = 'enviado', tracking_code = 'BR2' where id = 'CA-2'");
    await asRole(db, "authenticated", ADMIN);
    await expect(db.query("select cancel_order('CA-2', 'Extraviado')")).rejects.toThrow(/CONFIRMAR_ENVIADO/);
    await expect(db.query("select cancel_order('CA-2', ' ', true)")).rejects.toThrow(/MOTIVO_OBRIGATORIO/);
    await db.query("select cancel_order('CA-2', 'Extraviado', true)");
    await db.exec("reset role");
    expect((await db.query<{ status: string }>("select status from orders where id = 'CA-2'")).rows[0].status).toBe("cancelado");
  });

  it("falha no meio desfaz tudo (transação)", async () => {
    await create("CA-3");
    const before = await stock();
    // gatilho de teste que derruba o registro do evento de cancelamento
    await db.exec(`
      create function falha_evento() returns trigger language plpgsql as $$ begin
        if new.kind = 'cancelado' and new.order_id = 'CA-3' then raise exception 'FALHA_TESTE'; end if; return new; end $$;
      create trigger falha_evento before insert on order_events for each row execute function falha_evento();
    `);
    await asRole(db, "service_role");
    await expect(db.query("select cancel_order('CA-3', 'Teste de falha')")).rejects.toThrow(/FALHA_TESTE/);
    await db.exec("reset role; drop trigger falha_evento on order_events; drop function falha_evento();");
    expect((await db.query<{ status: string; stock_released: boolean }>("select status, stock_released from orders where id = 'CA-3'")).rows[0]).toMatchObject({ status: "aguardando-pagamento", stock_released: false });
    expect(await stock()).toBe(before);
  });

  it("sem sessão ou sem ser admin: recusado", async () => {
    await create("CA-4");
    await asRole(db, "anon");
    await expect(db.query("select cancel_order('CA-4', 'Invasão')")).rejects.toThrow(/permission denied/);
    await asRole(db, "authenticated", "cliente@exemplo.com");
    await expect(db.query("select cancel_order('CA-4', 'Invasão')")).rejects.toThrow(/SEM_PERMISSAO/);
    await expect(db.query("select mark_order_refunded('CA-1', 'Invasão')")).rejects.toThrow(/SEM_PERMISSAO/);
    await expect(db.query("select admin_dashboard(now() - interval '7 days')")).rejects.toThrow(/SEM_PERMISSAO/);
    await db.exec("reset role");
  });
});

describe("mark_order_refunded", () => {
  it("só em pedido cancelado, com nota, uma vez", async () => {
    await asRole(db, "authenticated", ADMIN);
    await expect(db.query("select mark_order_refunded('CA-4', 'Pix devolvido')")).rejects.toThrow(/SO_CANCELADO/);
    await expect(db.query("select mark_order_refunded('CA-1', '')")).rejects.toThrow(/NOTA_OBRIGATORIA/);
    const row = (await db.query<{ refunded_at: string | null; refund_note: string }>("select * from mark_order_refunded('CA-1', 'Pix devolvido pelo painel do MP')")).rows[0];
    expect(row.refunded_at).not.toBeNull();
    await db.query("select mark_order_refunded('CA-1', 'Outra')");
    await db.exec("reset role");
    expect((await events("CA-1")).filter((e) => e.kind === "reembolsado")).toHaveLength(1);
  });
});

describe("admin_dashboard", () => {
  it("conta só pedidos pagos, separa os de teste e lista estoque baixo", async () => {
    await create("DB-1");
    await create("DB-2", {}, 3);
    await create("DB-T", {}, 1);
    await db.exec(`
      update orders set status = 'pago' where id in ('DB-1', 'DB-2', 'DB-T');
      update orders set is_test = true where id = 'DB-T';
      update order_items set item_status = 'aguardando-compra' where order_id = 'DB-2';
      update product_variants set stock = 0 where sku = 'APX-002-UN';
    `);
    await asRole(db, "authenticated", ADMIN);
    const since = "now() - interval '1 hour'";
    type Dash = { orders: number; revenue_cents: number; average_cents: number; awaiting_supplier: number; paid_not_shipped: number; best_sellers: { slug: string; quantity: number }[]; low_stock: { sku: string }[]; by_day: unknown[] };
    const dash = (await db.query<{ d: Dash }>(`select admin_dashboard(${since}, 3) d`)).rows[0].d;
    const withTest = (await db.query<{ d: Dash }>(`select admin_dashboard(${since}, 3, true) d`)).rows[0].d;
    const totals = (await db.query<{ t: number }>("select sum(total_cents)::int t from orders where id in ('DB-1', 'DB-2')")).rows[0].t;
    // EV-1 (enviado) também conta: pedido pago criado na última hora
    const ev1 = (await db.query<{ t: number }>("select total_cents t from orders where id = 'EV-1'")).rows[0].t;
    expect(dash.orders).toBe(3);
    expect(dash.revenue_cents).toBe(totals + ev1);
    expect(dash.average_cents).toBe(Math.round((totals + ev1) / 3));
    expect(withTest.orders).toBe(4);
    expect(dash.awaiting_supplier).toBe(1);
    expect(dash.paid_not_shipped).toBe(2);
    expect(withTest.paid_not_shipped).toBe(3);
    expect(dash.best_sellers[0]).toMatchObject({ quantity: 5 });
    expect(dash.low_stock.some((row) => row.sku === "APX-002-UN")).toBe(true);
    expect(dash.by_day.length).toBeGreaterThanOrEqual(1);
    await db.exec("reset role");
  });
});
