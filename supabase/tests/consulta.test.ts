import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb, orderPayload } from "./db";

// Consulta de pedido (lookup_order) e limite de tentativas (rate_limit_hit) no banco simulado (PGlite). Não testado
// contra o Supabase real.
let db: PGlite;
const lookup = async (id: string, email: string) =>
  (await db.query<{ r: Record<string, unknown> | null }>("select lookup_order($1, $2) r", [id, email])).rows[0].r;
const hit = async (key: string, limit = 3, windowSeconds = 60, bucket = "teste") =>
  (await db.query<{ ok: boolean }>("select rate_limit_hit($1, $2, $3, $4) ok", [bucket, key, limit, windowSeconds])).rows[0].ok;
const KEY = "a".repeat(64);

beforeAll(async () => {
  db = await createDb();
  await asRole(db, "service_role");
  await db.query("select create_order($1::jsonb)", [orderPayload("APX-CONSULTA-1", [{ sku: "APX-001-M", quantity: 1 }], { cpf: "52998224725" })]);
  await db.exec("reset role");
  await db.exec("update orders set status = 'enviado', tracking_code = 'BR123456789BR', shipped_at = now() where id = 'APX-CONSULTA-1'");
  await db.exec("update order_items set supplier_tracking_code = 'FORN-SEGREDO', tracking_code = 'BR123456789BR' where order_id = 'APX-CONSULTA-1'");
}, 60_000);

describe("lookup_order", () => {
  it("número + e-mail certos: só dados de acompanhamento", async () => {
    await asRole(db, "service_role");
    const order = await lookup("apx-consulta-1 ", " Maria@Exemplo.com");
    expect(order).toMatchObject({ id: "APX-CONSULTA-1", status: "enviado", tracking_code: "BR123456789BR", city: "São Paulo", state: "SP" });
    const text = JSON.stringify(order);
    for (const secret of ["Rua A", "01000000", "11999999999", "52998224725", "FORN-SEGREDO", "access_token", "maria@exemplo.com", "Maria Silva"]) {
      expect(text).not.toContain(secret);
    }
    expect((order!.items as unknown[]).length).toBe(1);
  });

  it("pedido inexistente e e-mail errado dão a MESMA resposta (null)", async () => {
    await asRole(db, "service_role");
    expect(await lookup("APX-CONSULTA-1", "outra@exemplo.com")).toBeNull();
    expect(await lookup("APX-NAO-EXISTE", "maria@exemplo.com")).toBeNull();
  });

  it("chave pública e usuário logado não executam", async () => {
    for (const role of ["anon", "authenticated"]) {
      await asRole(db, role, "alguem@exemplo.com");
      await expect(lookup("APX-CONSULTA-1", "maria@exemplo.com")).rejects.toThrow(/permission denied/);
      await expect(hit(KEY)).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from rate_limit_hits")).rejects.toThrow(/permission denied/);
    }
  });
});

describe("rate_limit_hit", () => {
  it("conta por chave e balde e bloqueia ao passar do limite", async () => {
    await asRole(db, "service_role");
    expect([await hit(KEY), await hit(KEY), await hit(KEY), await hit(KEY)]).toEqual([true, true, true, false]);
    expect(await hit("b".repeat(64))).toBe(true); // outra chave
    expect(await hit(KEY, 3, 60, "outro")).toBe(true); // outro balde
  });

  it("libera quando a janela passa", async () => {
    await db.exec("reset role");
    await db.exec(`update rate_limit_hits set created_at = now() - interval '2 minutes' where key_hash = '${KEY}' and bucket = 'teste'`);
    await asRole(db, "service_role");
    expect(await hit(KEY)).toBe(true);
  });

  it("recusa parâmetros fora da faixa", async () => {
    await asRole(db, "service_role");
    await expect(hit(KEY, 0)).rejects.toThrow(/LIMITE_INVALIDO/);
    await expect(hit(KEY, 3, 100000)).rejects.toThrow(/LIMITE_INVALIDO/);
  });
});
