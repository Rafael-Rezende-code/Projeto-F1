import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb } from "./db";

// "Avise-me quando chegar" (tabela stock_alerts) no banco simulado (PGlite). Não testado contra o Supabase real.
let db: PGlite;
const ADMIN = "admin@apex.test";
const OUT = "APX-001-M"; // fica com estoque 0 no teste
const IN = "APX-001-G";
const TEXT = "Quero receber um e-mail quando este tamanho voltar ao estoque.";
const insert = (email: string, sku: string, consent = true, ip: string | null = null) =>
  db.query("insert into stock_alerts (email, sku, consent, consent_text, ip_hash) values ($1, $2, $3, $4, $5)", [email, sku, consent, TEXT, ip]);

beforeAll(async () => {
  db = await createDb();
  await db.exec(`insert into admin_emails (email) values ('${ADMIN}'); update product_variants set stock = 0 where sku = '${OUT}'; update product_variants set stock = 4 where sku = '${IN}';`);
}, 60_000);

describe("stock_alerts", () => {
  it("visitante pede aviso de tamanho esgotado, com consentimento; não lê, não altera, não apaga", async () => {
    await asRole(db, "anon");
    await insert("maria@exemplo.com", OUT);
    await expect(db.query("select * from stock_alerts")).rejects.toThrow(/permission denied/);
    await expect(db.query("update stock_alerts set notified_at = now()")).rejects.toThrow(/permission denied/);
    await expect(db.query("delete from stock_alerts")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });

  it("recusa tamanho com estoque, produto não publicado, sem consentimento, e-mail inválido e coluna extra", async () => {
    await asRole(db, "anon");
    await expect(insert("joao@exemplo.com", IN)).rejects.toThrow(/row-level security/);
    await expect(insert("joao@exemplo.com", OUT, false)).rejects.toThrow(/check|row-level security/);
    await expect(insert("nao-e-email", OUT)).rejects.toThrow(/check/);
    await expect(db.query("insert into stock_alerts (email, sku, consent, consent_text, notified_at) values ('x@y.com', $1, true, $2, now())", [OUT, TEXT])).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
    await db.exec(`update products set status = 'draft' where id = (select product_id from product_variants where sku = '${OUT}')`);
    await asRole(db, "anon");
    await expect(insert("ana@exemplo.com", OUT)).rejects.toThrow(/row-level security/);
    await db.exec("reset role");
    await db.exec(`update products set status = 'active' where id = (select product_id from product_variants where sku = '${OUT}')`);
  });

  it("um aviso por e-mail e tamanho", async () => {
    await asRole(db, "anon");
    await expect(insert("maria@exemplo.com", OUT)).rejects.toThrow(/duplicate key|unique/);
    await db.exec("reset role");
  });

  it("limite por IP no banco: 10 por hora", async () => {
    await asRole(db, "anon");
    const ip = "a".repeat(64);
    for (let i = 0; i < 10; i++) await insert(`ip${i}@exemplo.com`, OUT, true, ip);
    await expect(insert("ip10@exemplo.com", OUT, true, ip)).rejects.toThrow(/LIMITE_POR_IP/);
    await db.exec("reset role");
  });

  it("administrador lê e marca como avisado", async () => {
    await asRole(db, "authenticated", ADMIN);
    const rows = (await db.query<{ email: string }>("select email from stock_alerts order by created_at")).rows;
    expect(rows[0].email).toBe("maria@exemplo.com");
    await db.exec("update stock_alerts set notified_at = now() where email = 'maria@exemplo.com'");
    await db.exec("reset role");
    await asRole(db, "authenticated", "cliente@exemplo.com");
    expect((await db.query("select * from stock_alerts")).rows).toHaveLength(0);
    await db.exec("reset role");
  });
});
