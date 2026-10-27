// Semana de corrida (loja extra, item 5): regras puras de datas e fusos (testes em calendar.test.ts). O calendário vem
// da tabela race_weekends (painel /admin/corridas, com importação opcional da temporada). A loja NÃO inventa calendário:
// sem dados, o bloco "Próxima corrida" não aparece; o exemplo de lib/calendar-example.ts só existe em desenvolvimento.

export type RaceWeekend = {
  id: string;
  gpName: string;
  circuit: string;
  country: string;
  /** Sexta-feira do fim de semana (AAAA-MM-DD, horário de Brasília). */
  weekendStart: string;
  /** Largada (ISO com fuso). */
  raceStart: string;
  /** Coleção em destaque (lib/content/collections.ts) OU tags do catálogo para "Ver a coleção do fim de semana". */
  collectionSlug?: string | null;
  tags: string[];
  active: boolean;
};

export const BRASILIA = "America/Sao_Paulo";
/** A corrida continua "a próxima" até 2 h depois da largada (enquanto acontece). */
export const RACE_DURATION_MS = 2 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

/** Meia-noite de uma data AAAA-MM-DD em Brasília (UTC−3 o ano todo, sem horário de verão desde 2019). */
export const brasiliaMidnight = (date: string) => new Date(`${date}T00:00:00-03:00`).getTime();
/** Data (AAAA-MM-DD) de um instante em Brasília. */
export const brasiliaDate = (iso: string | number) => new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function nextRace(races: RaceWeekend[], now: number) {
  return (
    races
      .filter((race) => race.active && new Date(race.raceStart).getTime() + RACE_DURATION_MS > now)
      .sort((a, b) => new Date(a.raceStart).getTime() - new Date(b.raceStart).getTime())[0] ?? null
  );
}

/** Janela "semana de corrida": da sexta (00:00) até a segunda depois da corrida (23:59), em Brasília. */
export function raceWeekWindow(race: Pick<RaceWeekend, "weekendStart" | "raceStart">) {
  const start = brasiliaMidnight(race.weekendStart);
  const end = brasiliaMidnight(brasiliaDate(race.raceStart)) + 2 * DAY - 1;
  return { start, end };
}

export function isRaceWeek(race: Pick<RaceWeekend, "weekendStart" | "raceStart"> | null, now: number) {
  if (!race) return false;
  const { start, end } = raceWeekWindow(race);
  return now >= start && now <= end;
}

export type RacePhase = "antes" | "agora" | "fim";
export function racePhase(race: Pick<RaceWeekend, "raceStart">, now: number): RacePhase {
  const start = new Date(race.raceStart).getTime();
  if (now < start) return "antes";
  return now < start + RACE_DURATION_MS ? "agora" : "fim";
}

/** Partes do contador regressivo (nunca negativas). */
export function countdown(raceStart: string, now: number) {
  const total = Math.max(0, new Date(raceStart).getTime() - now);
  return {
    total,
    days: Math.floor(total / DAY),
    hours: Math.floor((total % DAY) / 3_600_000),
    minutes: Math.floor((total % 3_600_000) / 60_000),
    seconds: Math.floor((total % 60_000) / 1000),
  };
}

/** "domingo, 16/11, 14:00" no fuso pedido (o do visitante ou Brasília). */
export function formatRaceTime(iso: string, timeZone?: string) {
  const date = new Date(iso);
  const options = { timeZone, weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false } as const;
  return new Intl.DateTimeFormat("pt-BR", options).format(date).replace(" às ", ", ");
}

export function raceCollectionHref(race: Pick<RaceWeekend, "collectionSlug" | "tags">) {
  if (race.collectionSlug) return `/colecoes/${race.collectionSlug}`;
  return race.tags.length ? `/produtos?tag=${race.tags.join(",")}` : "/produtos";
}

type RaceRow = { id: string; gp_name: string; circuit: string; country: string; weekend_start: string; race_start: string; collection_slug: string | null; tags: string[] | null; active: boolean };
export const raceFromRow = (row: RaceRow): RaceWeekend => ({
  id: row.id,
  gpName: row.gp_name,
  circuit: row.circuit,
  country: row.country,
  weekendStart: row.weekend_start.slice(0, 10),
  raceStart: row.race_start,
  collectionSlug: row.collection_slug,
  tags: row.tags ?? [],
  active: row.active,
});

/** Fusos oferecidos no painel para digitar a largada (o padrão é Brasília). */
export const RACE_TIME_ZONES = [
  ["America/Sao_Paulo", "Brasília"],
  ["UTC", "UTC"],
  ["Europe/London", "Londres"],
  ["Europe/Paris", "Europa Central (Paris, Madri, Roma)"],
  ["Europe/Istanbul", "Istambul"],
  ["Asia/Baku", "Baku"],
  ["Asia/Dubai", "Dubai / Abu Dhabi"],
  ["Asia/Qatar", "Catar / Bahrein / Arábia Saudita"],
  ["Asia/Singapore", "Singapura / Xangai"],
  ["Asia/Tokyo", "Tóquio"],
  ["Australia/Melbourne", "Melbourne"],
  ["America/New_York", "Nova York / Miami / Montreal"],
  ["America/Chicago", "Austin"],
  ["America/Mexico_City", "Cidade do México"],
  ["America/Los_Angeles", "Las Vegas"],
] as const;

const offsetAt = (instant: number, timeZone: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(instant))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - Math.floor(instant / 1000) * 1000;
};

/** "AAAA-MM-DDTHH:mm" no fuso informado → ISO em UTC. null se a data for inválida. Considera horário de verão. */
export function zonedToUtc(local: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(wall) || new Date(wall).getUTCDate() !== d) return null;
  try {
    let guess = wall - offsetAt(wall, timeZone);
    guess = wall - offsetAt(guess, timeZone);
    return new Date(guess).toISOString();
  } catch {
    return null;
  }
}

/** ISO → "AAAA-MM-DDTHH:mm" no fuso (para o campo do painel). */
export function utcToZoned(iso: string, timeZone: string) {
  const local = new Date(new Date(iso).getTime() + offsetAt(new Date(iso).getTime(), timeZone));
  return local.toISOString().slice(0, 16);
}
