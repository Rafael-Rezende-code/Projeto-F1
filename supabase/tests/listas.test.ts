import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb } from "./db";

// Lista de desejos com link curto (loja extra, item 4) no banco simulado (PGlite): só o servidor (service role) cria e
// lê; o público não lê nem grava; formato do token e tamanho limitados. Não testado no Supabase real.
let db: PGlite;

beforeAll(async () => {
  db = await createDb();
}, 60_000);

describe("listas de desejos (banco simulado)", () => {
  it("o servidor cria e lê pelo token; o público não acessa", async () => {
    await asRole(db, "service_role");
    await db.query("insert into wishlists (token, name, product_slugs, secret_hash) values ('aB3dE5gH9k', 'Rafa', array['camiseta-ferrari-2026'], 'hash')");
    expect((await db.query("select name from wishlists where token = 'aB3dE5gH9k'")).rows).toEqual([{ name: "Rafa" }]);
    await asRole(db, "anon");
    await expect(db.query("select * from wishlists")).rejects.toThrow();
    await expect(db.query("insert into wishlists (token, secret_hash) values ('zzzzzzzzzz', 'x')")).rejects.toThrow();
    await asRole(db, "service_role");
  });

  it("token no formato e tamanho limitados", async () => {
    await expect(db.query("insert into wishlists (token, secret_hash) values ('curto', 'x')")).rejects.toThrow();
    await expect(db.query("insert into wishlists (token, name, secret_hash) values ('aaaaaaaaa1', $1, 'x')", ["x".repeat(31)])).rejects.toThrow();
    const many = Array.from({ length: 61 }, (_, i) => `p${i}`);
    await expect(db.query("insert into wishlists (token, product_slugs, secret_hash) values ('aaaaaaaaa2', $1, 'x')", [many])).rejects.toThrow();
  });
});
