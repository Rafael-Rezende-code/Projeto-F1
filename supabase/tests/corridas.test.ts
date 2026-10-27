import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb } from "./db";

// Semana de corrida (loja extra, item 5) no banco simulado (PGlite): o público lê só as ativas e não grava; datas
// coerentes; importação idempotente pela origem. Não testado no Supabase real. Dados de TESTE (não é um calendário).
let db: PGlite;

beforeAll(async () => {
  db = await createDb();
  await asRole(db, "service_role");
  await db.exec(`
    insert into race_weekends (gp_name, weekend_start, race_start, active, source_key) values
      ('GP Teste A', '2030-03-01', '2030-03-03T15:00:00Z', true, 'teste-a'),
      ('GP Teste B', '2030-04-05', '2030-04-07T15:00:00Z', false, null);
  `);
}, 60_000);

describe("corridas (banco simulado)", () => {
  it("público lê só as ativas e não grava", async () => {
    await asRole(db, "anon");
    expect((await db.query("select gp_name from race_weekends")).rows).toEqual([{ gp_name: "GP Teste A" }]);
    await expect(db.query("insert into race_weekends (gp_name, weekend_start, race_start) values ('X', '2030-01-01', '2030-01-03T10:00:00Z')")).rejects.toThrow();
    await asRole(db, "service_role");
  });

  it("sexta não pode ser depois da corrida; reimportar pela origem atualiza", async () => {
    await expect(db.query("insert into race_weekends (gp_name, weekend_start, race_start) values ('X', '2030-01-05', '2030-01-03T10:00:00Z')")).rejects.toThrow();
    await db.query("insert into race_weekends (gp_name, weekend_start, race_start, source_key) values ('GP Teste A2', '2030-03-01', '2030-03-03T16:00:00Z', 'teste-a') on conflict (source_key) do update set gp_name = excluded.gp_name, race_start = excluded.race_start");
    expect((await db.query("select gp_name from race_weekends where source_key = 'teste-a'")).rows).toEqual([{ gp_name: "GP Teste A2" }]);
  });
});
