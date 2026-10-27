import { describe, expect, it } from "vitest";
import { parseJolpicaSeason } from "./calendar-import";

// Amostra no formato da Jolpica (dados de teste, não um calendário real).
const sample = {
  MRData: {
    RaceTable: {
      season: "2027",
      Races: [
        { season: "2027", round: "2", raceName: "São Paulo Grand Prix", date: "2027-11-07", time: "17:00:00Z", Circuit: { circuitName: "Autódromo José Carlos Pace", Location: { country: "Brazil" } }, FirstPractice: { date: "2027-11-05", time: "14:30:00Z" } },
        { season: "2027", round: "1", raceName: "Las Vegas Grand Prix", date: "2027-11-21", time: "06:00:00Z", Circuit: { circuitName: "Las Vegas Strip Circuit", Location: { country: "USA" } }, FirstPractice: { date: "2027-11-20", time: "00:30:00Z" } },
        { season: "2027", round: "3", raceName: "Sem data" },
        { season: "2027", round: "4", raceName: "Test Grand Prix", date: "2027-12-05", Circuit: { circuitName: "X", Location: { country: "Nowhere" } } },
      ],
    },
  },
};

describe("importação do calendário (Jolpica)", () => {
  it("converte, ordena pela etapa e ignora corrida sem data", () => {
    const { races, skipped, season } = parseJolpicaSeason(sample);
    expect(season).toBe("2027");
    expect(skipped).toBe(1);
    expect(races.map((race) => race.round)).toEqual([1, 2, 4]);
    expect(races[1]).toEqual({ sourceKey: "jolpica-2027-02", round: 2, gpName: "GP de São Paulo", circuit: "Autódromo José Carlos Pace", country: "Brasil", weekendStart: "2027-11-05", raceStart: "2027-11-07T17:00:00.000Z" });
  });

  it("sexta = a sexta igual ou anterior ao dia da corrida em Brasília (treino de quinta à noite não muda); sem horário, meio-dia UTC", () => {
    const { races } = parseJolpicaSeason(sample);
    expect(races[0].weekendStart).toBe("2027-11-19");
    const saturday = parseJolpicaSeason({ MRData: { RaceTable: { season: "2027", Races: [{ round: "9", raceName: "Night Race", date: "2027-03-27", time: "16:00:00Z", FirstPractice: { date: "2027-03-25", time: "23:30:00Z" } }] } } });
    expect(saturday.races[0].weekendStart).toBe("2027-03-26");
    expect(races[2]).toMatchObject({ gpName: "Test Grand Prix", country: "Nowhere", raceStart: "2027-12-05T12:00:00.000Z", weekendStart: "2027-12-03" });
  });

  it("resposta inválida não quebra", () => {
    expect(parseJolpicaSeason(null)).toEqual({ races: [], skipped: 0, season: null });
    expect(parseJolpicaSeason({ MRData: {} }).races).toEqual([]);
  });
});
