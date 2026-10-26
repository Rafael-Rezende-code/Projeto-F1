import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb, orderPayload } from "./db";

// Avaliações (tabela reviews e submit_review) no banco simulado (PGlite). Não testado contra o Supabase real.
let db: PGlite;
const ADMIN = "admin@apex.test";
const EMAIL = "maria@exemplo.com"; // e-mail do orderPayload
const SLUG = "scuderia-racing-jacket"; // APX-001

const submit = async (order: string, email: string, slug = SLUG, rating = 5) => {
  await asRole(db, "service_role");
  const row = (await db.query<{ r: string }>("select submit_review($1, $2, $3, $4, $5, $6, $7) r", [order, email, slug, rating, "Ótima jaqueta", "Caimento perfeito e acabamento bonito.", "Maria S."])).rows[0];
  await db.exec("reset role");
  return row.r;
};

beforeAll(async () => {
  db = await createDb();
  await db.exec(`insert into admin_emails (email) values ('${ADMIN}'); update product_variants set stock = 50 where sku = 'APX-001-M';`);
  await asRole(db, "service_role");
  await db.query("select create_order($1::jsonb)", [orderPayload("AV-1", [{ sku: "APX-001-M", quantity: 1 }])]);
  await db.query("select create_order($1::jsonb)", [orderPayload("AV-2", [{ sku: "APX-001-M", quantity: 1 }])]);
  await db.exec("reset role");
  await db.exec("update orders set status = 'entregue' where id = 'AV-1'; update orders set status = 'pago' where id = 'AV-2';");
}, 60_000);

describe("submit_review", () => {
  it("pedido entregue + e-mail certo + produto do pedido: grava PENDENTE; repetir dá 'ja_avaliado'", async () => {
    expect(await submit("av-1", " Maria@Exemplo.com ")).toBe("ok");
    expect(await submit("AV-1", EMAIL)).toBe("ja_avaliado");
    expect((await db.query<{ status: string }>("select status from reviews")).rows).toEqual([{ status: "pendente" }]);
  });

  it("e-mail errado e pedido inexistente dão a mesma resposta; não entregue e produto de fora são recusados", async () => {
    expect(await submit("AV-1", "outra@exemplo.com")).toBe("nao_encontrado");
    expect(await submit("AV-999", EMAIL)).toBe("nao_encontrado");
    expect(await submit("AV-2", EMAIL)).toBe("nao_entregue");
    expect(await submit("AV-1", EMAIL, "ferrari-team-cap")).toBe("produto_fora_do_pedido");
  });

  it("nota fora de 1–5 não grava", async () => {
    await db.exec("update orders set status = 'entregue' where id = 'AV-2'");
    await expect(submit("AV-2", EMAIL, SLUG, 6)).rejects.toThrow(/check/);
  });

  it("visitante e usuário comum não chamam a função nem gravam direto", async () => {
    for (const [role, email] of [["anon", undefined], ["authenticated", "cliente@exemplo.com"]] as const) {
      await asRole(db, role, email);
      await expect(db.query("select submit_review('AV-1', $1, $2, 5, 'x', 'yyyyyyyyyyyy', 'zz')", [EMAIL, SLUG])).rejects.toThrow(/permission denied/);
      await expect(db.query("insert into reviews (product_slug, order_id, rating, title, body, display_name) values ($1, 'AV-1', 5, 'xx', 'yyyyyyyyyyyy', 'zz')", [SLUG])).rejects.toThrow(/permission denied/);
    }
    await db.exec("reset role");
  });
});

describe("leitura e moderação", () => {
  it("o público só vê aprovadas e só as colunas de exibição", async () => {
    await asRole(db, "anon");
    expect((await db.query("select id, rating from reviews")).rows).toHaveLength(0); // ainda pendente
    await expect(db.query("select order_id from reviews")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });

  it("administrador aprova (registra quem e quando) e aí a avaliação fica pública", async () => {
    await asRole(db, "authenticated", ADMIN);
    await db.exec("update reviews set status = 'aprovada'");
    const row = (await db.query<{ moderated_by: string; moderated_at: string | null }>("select moderated_by, moderated_at from reviews")).rows[0];
    expect(row.moderated_by).toBe(ADMIN);
    expect(row.moderated_at).not.toBeNull();
    await db.exec("reset role");
    await asRole(db, "anon");
    expect((await db.query<{ rating: number; display_name: string }>("select rating, display_name from reviews")).rows).toEqual([{ rating: 5, display_name: "Maria S." }]);
    await db.exec("reset role");
  });

  it("usuário comum não modera", async () => {
    await asRole(db, "authenticated", "cliente@exemplo.com");
    await db.exec("update reviews set status = 'rejeitada'");
    await db.exec("reset role");
    expect((await db.query<{ status: string }>("select status from reviews")).rows[0].status).toBe("aprovada");
  });
});
