import type { RaceWeekend } from "@/lib/calendar";

// EXEMPLO-CALENDARIO-DEV. Só para ver o bloco "Próxima corrida" no ambiente de DESENVOLVIMENTO sem banco: lib/calendar-store.ts
// importa este arquivo apenas quando NODE_ENV === "development" (no build de produção o import some; lib/calendar-build.test.ts
// confere). NÃO é um calendário real: nomes e datas são inventados e relativos a hoje.
const DAY = 86_400_000;

export function exampleRaces(now = Date.now()): RaceWeekend[] {
  const friday = (offsetDays: number) => {
    const date = new Date(now + offsetDays * DAY - 3 * 3_600_000);
    const toFriday = (5 - date.getUTCDay() + 7) % 7;
    return new Date(date.getTime() + toFriday * DAY).toISOString().slice(0, 10);
  };
  const race = (id: string, offsetDays: number): RaceWeekend => {
    const weekendStart = friday(offsetDays);
    return {
      id,
      gpName: `[EXEMPLO] GP de Exemplo ${id}`,
      circuit: "Circuito de exemplo",
      country: "Exemplo",
      weekendStart,
      raceStart: new Date(new Date(`${weekendStart}T14:00:00-03:00`).getTime() + 2 * DAY).toISOString(),
      collectionSlug: null,
      tags: ["camiseta"],
      active: true,
    };
  };
  return [race("1", 0), race("2", 14)];
}
