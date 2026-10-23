import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb, orderPayload } from "./db";

// Registro idempotente de e-mails (email_log) no banco simulado (PGlite). Não testado contra o Supabase real.
let db: PGlite;
const claim = async (type = "pedido-recebido", id = "EM-1") => (await db.query<{ ok: boolean }>("select claim_order_email($1, $2) ok", [id, type])).rows[0].ok;
const finish = (ok: boolean, type = "pedido-recebido") => db.query("select finish_order_email('EM-1', $1, $2, 'console', null, $3)", [type, ok, ok ? null : "falha de teste"]);

beforeAll(async () => {
  db = await createDb();
  await asRole(db, "service_role");
  await db.query("select create_order($1::jsonb)", [orderPayload("EM-1", [{ sku: "APX-001-M", quantity: 1 }])]);
}, 60_000);

describe("email_log", () => {
  it("um e-mail por pedido + tipo, mesmo com chamadas simultâneas", async () => {
    await asRole(db, "service_role");
    const results = await Promise.all([claim(), claim(), claim()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    await finish(true);
    expect(await claim()).toBe(false);
    expect(await claim("pagamento-aprovado")).toBe(true); // outro tipo é outro e-mail
  });

  it("falha pode ser tentada de novo, até 5 vezes", async () => {
    await asRole(db, "service_role");
    expect(await claim("enviado")).toBe(true);
    for (let i = 0; i < 4; i++) {
      await finish(false, "enviado");
      expect(await claim("enviado")).toBe(true);
    }
    await finish(false, "enviado");
    expect(await claim("enviado")).toBe(false);
  });

  it("tipo desconhecido é recusado; público e usuário comum não executam nem leem", async () => {
    await asRole(db, "service_role");
    await expect(claim("spam")).rejects.toThrow(/check/);
    for (const [role, email] of [["anon", undefined], ["authenticated", "cliente@exemplo.com"]] as const) {
      await asRole(db, role, email);
      await expect(claim("cancelado")).rejects.toThrow(/permission denied/);
      const rows = await db.query("select * from email_log").then((r) => r.rows.length, (e: Error) => e.message);
      expect(rows === 0 || /permission denied/.test(String(rows))).toBe(true);
    }
    await db.exec("reset role");
  });
});
