// Importação do calendário da temporada (loja extra, item 5): parte pura (testes em calendar-import.test.ts). Fonte:
// Jolpica (https://api.jolpi.ca/ergast/f1/{temporada}.json), sucessora aberta e gratuita da Ergast. Usada SÓ pelo painel,
// que mostra a prévia (horários em Brasília) antes de gravar; o site nunca consulta a fonte em tempo de uso.
import { brasiliaDate } from "@/lib/calendar";

export const JOLPICA_URL = (season: number) => `https://api.jolpi.ca/ergast/f1/${season}.json?limit=100`;

export type ImportedRace = { sourceKey: string; round: number; gpName: string; circuit: string; country: string; weekendStart: string; raceStart: string };

type JolpicaRace = {
  season?: string;
  round?: string;
  raceName?: string;
  date?: string;
  time?: string;
  Circuit?: { circuitName?: string; Location?: { country?: string } };
  FirstPractice?: { date?: string; time?: string };
};

const GP_NAMES: Record<string, string> = {
  "Australian Grand Prix": "GP da Austrália", "Chinese Grand Prix": "GP da China", "Japanese Grand Prix": "GP do Japão",
  "Bahrain Grand Prix": "GP do Bahrein", "Saudi Arabian Grand Prix": "GP da Arábia Saudita", "Miami Grand Prix": "GP de Miami",
  "Canadian Grand Prix": "GP do Canadá", "Monaco Grand Prix": "GP de Mônaco", "Spanish Grand Prix": "GP da Espanha",
  "Barcelona Grand Prix": "GP de Barcelona", "Austrian Grand Prix": "GP da Áustria", "British Grand Prix": "GP da Grã-Bretanha",
  "Belgian Grand Prix": "GP da Bélgica", "Hungarian Grand Prix": "GP da Hungria", "Dutch Grand Prix": "GP da Holanda",
  "Italian Grand Prix": "GP da Itália", "Madrid Grand Prix": "GP de Madri", "Azerbaijan Grand Prix": "GP do Azerbaijão",
  "Singapore Grand Prix": "GP de Singapura", "United States Grand Prix": "GP dos Estados Unidos", "Mexico City Grand Prix": "GP da Cidade do México",
  "São Paulo Grand Prix": "GP de São Paulo", "Brazilian Grand Prix": "GP do Brasil", "Las Vegas Grand Prix": "GP de Las Vegas", "Qatar Grand Prix": "GP do Catar",
  "Abu Dhabi Grand Prix": "GP de Abu Dhabi", "Emilia Romagna Grand Prix": "GP da Emília-Romanha",
};
const COUNTRIES: Record<string, string> = {
  Australia: "Austrália", China: "China", Japan: "Japão", Bahrain: "Bahrein", "Saudi Arabia": "Arábia Saudita", USA: "Estados Unidos",
  "United States": "Estados Unidos", Canada: "Canadá", Monaco: "Mônaco", Spain: "Espanha", Austria: "Áustria", UK: "Reino Unido",
  "United Kingdom": "Reino Unido", Belgium: "Bélgica", Hungary: "Hungria", Netherlands: "Holanda", Italy: "Itália", Azerbaijan: "Azerbaijão",
  Singapore: "Singapura", Mexico: "México", Brazil: "Brasil", Malaysia: "Malásia", Qatar: "Catar", UAE: "Emirados Árabes Unidos", "United Arab Emirates": "Emirados Árabes Unidos",
};

const iso = (date?: string, time?: string) => (date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T${time && /^\d{2}:\d{2}:\d{2}Z?$/.test(time) ? time.replace(/Z?$/, "Z") : "12:00:00Z"}` : null);

/** Resposta da Jolpica → corridas para a prévia. Corrida sem data válida é ignorada (e contada em `skipped`). */
export function parseJolpicaSeason(json: unknown): { races: ImportedRace[]; skipped: number; season: string | null } {
  const table = (json as { MRData?: { RaceTable?: { season?: string; Races?: JolpicaRace[] } } })?.MRData?.RaceTable;
  const list = Array.isArray(table?.Races) ? table.Races : [];
  const races: ImportedRace[] = [];
  let skipped = 0;
  for (const race of list) {
    const raceStart = iso(race.date, race.time);
    const round = Number(race.round);
    if (!raceStart || !Number.isInteger(round) || !race.raceName) {
      skipped++;
      continue;
    }
    // Sexta do fim de semana: a sexta igual ou anterior ao dia da corrida EM BRASÍLIA (o primeiro treino pode cair na
    // quinta à noite no Brasil, como na Austrália; corrida de sábado também tem a sua sexta).
    const raceDay = brasiliaDate(raceStart);
    const back = (new Date(`${raceDay}T12:00:00Z`).getUTCDay() - 5 + 7) % 7;
    const weekendStart = new Date(new Date(`${raceDay}T12:00:00Z`).getTime() - back * 86_400_000).toISOString().slice(0, 10);
    races.push({
      sourceKey: `jolpica-${race.season ?? table?.season}-${String(round).padStart(2, "0")}`,
      round,
      gpName: GP_NAMES[race.raceName] ?? race.raceName,
      circuit: race.Circuit?.circuitName ?? "",
      country: COUNTRIES[race.Circuit?.Location?.country ?? ""] ?? race.Circuit?.Location?.country ?? "",
      weekendStart,
      raceStart: new Date(raceStart).toISOString(),
    });
  }
  return { races: races.sort((a, b) => a.round - b.round), skipped, season: table?.season ?? null };
}
