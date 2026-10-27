import { describe, expect, it } from "vitest";
import { utcToZoned, zonedToUtc, brasiliaDate, countdown, formatRaceTime, isRaceWeek, nextRace, raceCollectionHref, racePhase, raceWeekWindow, type RaceWeekend } from "./calendar";

const race = (id: string, weekendStart: string, raceStart: string, extra: Partial<RaceWeekend> = {}): RaceWeekend => ({ id, gpName: `GP ${id}`, circuit: "Circuito", country: "País", weekendStart, raceStart, tags: [], active: true, ...extra });
const at = (iso: string) => new Date(iso).getTime();

describe("calendário de corridas", () => {
  // Interlagos: largada domingo 14:00 em Brasília (17:00 UTC). Las Vegas: sábado 22:00 local = domingo 03:00 em Brasília.
  const interlagos = race("sp", "2026-11-06", "2026-11-08T17:00:00Z");
  const vegas = race("lv", "2026-11-20", "2026-11-22T06:00:00Z");

  it("próxima corrida: ativa, futura (ou acontecendo até 2 h depois da largada), a mais cedo", () => {
    const races = [vegas, interlagos, race("off", "2026-11-01", "2026-11-02T10:00:00Z", { active: false })];
    expect(nextRace(races, at("2026-10-27T12:00:00Z"))?.id).toBe("sp");
    expect(nextRace(races, at("2026-11-08T18:30:00Z"))?.id).toBe("sp");
    expect(nextRace(races, at("2026-11-08T19:01:00Z"))?.id).toBe("lv");
    expect(nextRace(races, at("2026-12-01T00:00:00Z"))).toBeNull();
    expect(nextRace([], at("2026-10-27T12:00:00Z"))).toBeNull();
  });

  it("semana de corrida: de sexta 00:00 a segunda 23:59, em Brasília", () => {
    expect(isRaceWeek(interlagos, at("2026-11-06T02:59:59Z"))).toBe(false); // quinta 23:59:59 em Brasília
    expect(isRaceWeek(interlagos, at("2026-11-06T03:00:00Z"))).toBe(true); // sexta 00:00 em Brasília
    expect(isRaceWeek(interlagos, at("2026-11-10T02:59:59Z"))).toBe(true); // segunda 23:59:59 em Brasília
    expect(isRaceWeek(interlagos, at("2026-11-10T03:00:00Z"))).toBe(false);
    // Corrida de madrugada no Brasil (domingo 03:00 em Brasília): a segunda continua sendo a do dia seguinte.
    const { end } = raceWeekWindow(vegas);
    expect(new Date(end).toISOString()).toBe("2026-11-24T02:59:59.999Z");
    expect(isRaceWeek(null, Date.now())).toBe(false);
  });

  it("data em Brasília e horário no fuso pedido", () => {
    expect(brasiliaDate("2026-11-22T06:00:00Z")).toBe("2026-11-22");
    expect(brasiliaDate("2026-11-22T02:00:00Z")).toBe("2026-11-21");
    expect(formatRaceTime("2026-11-08T17:00:00Z", "America/Sao_Paulo")).toBe("domingo, 08/11, 14:00");
    expect(formatRaceTime("2026-11-08T17:00:00Z", "Europe/Lisbon")).toBe("domingo, 08/11, 17:00");
    expect(formatRaceTime("2026-11-22T06:00:00Z", "America/Los_Angeles")).toBe("sábado, 21/11, 22:00");
  });

  it("contador e fase", () => {
    expect(countdown("2026-11-08T17:00:00Z", at("2026-11-06T15:58:57Z"))).toEqual({ total: 2 * 86_400_000 + 3_600_000 + 63_000, days: 2, hours: 1, minutes: 1, seconds: 3 });
    expect(countdown("2026-11-08T17:00:00Z", at("2026-11-09T00:00:00Z")).total).toBe(0);
    expect(racePhase(interlagos, at("2026-11-08T16:59:00Z"))).toBe("antes");
    expect(racePhase(interlagos, at("2026-11-08T17:30:00Z"))).toBe("agora");
    expect(racePhase(interlagos, at("2026-11-08T19:00:00Z"))).toBe("fim");
  });

  it("link da coleção do fim de semana", () => {
    expect(raceCollectionHref({ collectionSlug: "colecionaveis", tags: ["a"] })).toBe("/colecoes/colecionaveis");
    expect(raceCollectionHref({ collectionSlug: null, tags: ["interlagos", "brasil"] })).toBe("/produtos?tag=interlagos,brasil");
    expect(raceCollectionHref({ tags: [] })).toBe("/produtos");
  });
});


describe("largada digitada no fuso do circuito", () => {
  it("converte para UTC, com e sem horário de verão, e volta", () => {
    expect(zonedToUtc("2026-11-08T14:00", "America/Sao_Paulo")).toBe("2026-11-08T17:00:00.000Z");
    expect(zonedToUtc("2026-07-05T15:00", "Europe/London")).toBe("2026-07-05T14:00:00.000Z"); // verão (UTC+1)
    expect(zonedToUtc("2026-12-06T17:00", "Asia/Dubai")).toBe("2026-12-06T13:00:00.000Z");
    expect(zonedToUtc("2026-11-21T22:00", "America/Los_Angeles")).toBe("2026-11-22T06:00:00.000Z");
    expect(zonedToUtc("2026-02-30T10:00", "UTC")).toBeNull();
    expect(zonedToUtc("ontem", "UTC")).toBeNull();
    expect(utcToZoned("2026-11-08T17:00:00.000Z", "America/Sao_Paulo")).toBe("2026-11-08T14:00");
  });
});
