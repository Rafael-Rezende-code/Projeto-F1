import { describe, expect, it } from "vitest";
import { raceFormSchema, raceRow } from "./race-schema";

// Dados de TESTE (não é um calendário real).
const base = { gpName: "GP Teste", circuit: "Circuito Teste", country: "Brasil", weekendStart: "2030-11-08", raceLocal: "2030-11-10T14:00", timeZone: "America/Sao_Paulo", collectionSlug: "", tags: "Camiseta, interlagos, x y", active: true };

describe("formulário de corrida", () => {
  it("largada no fuso escolhido vira UTC; tags limpas", () => {
    expect(raceRow(raceFormSchema.parse(base))).toEqual({ gp_name: "GP Teste", circuit: "Circuito Teste", country: "Brasil", weekend_start: "2030-11-08", race_start: "2030-11-10T17:00:00.000Z", collection_slug: null, tags: ["camiseta", "interlagos"], active: true });
    expect(raceRow(raceFormSchema.parse({ ...base, timeZone: "Europe/London" })).race_start).toBe("2030-11-10T14:00:00.000Z");
  });

  it("recusa sexta depois da corrida, data inválida e fuso fora da lista", () => {
    const issues = (value: object) => raceFormSchema.safeParse({ ...base, ...value }).error?.issues.map((issue) => issue.path.join(".")) ?? [];
    expect(issues({ weekendStart: "2030-11-11" })).toContain("weekendStart");
    expect(issues({ raceLocal: "2030-02-30T14:00" })).toContain("raceLocal");
    expect(issues({ timeZone: "Marte/Olympus" })).toContain("timeZone");
  });
});
