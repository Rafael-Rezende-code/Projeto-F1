import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RaceCountdown } from "@/components/race-countdown";
import { isRaceWeek, raceCollectionHref, type RaceWeekend } from "@/lib/calendar";

// Bloco "Próxima corrida" (loja extra, item 5): home, pilotos e equipes. A corrida é escolhida no servidor (a página
// revalida de hora em hora); sem corrida futura, a página nem chama este bloco. De sexta a segunda do fim de semana,
// selo "Semana de corrida" (e, na home, o bloco sobe).
export function NextRace({ race, now, className = "" }: { race: RaceWeekend; now: number; className?: string }) {
  const week = isRaceWeek(race, now);
  return (
    <section aria-labelledby={`corrida-${race.id}`} className={`rounded-2xl bg-[#f5f5f3] p-5 text-black sm:p-8 ${className}`} data-next-race>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">
            Próxima corrida
            {week && <span className="rounded-md bg-[#b94f01] px-2 py-0.5 tracking-[0.12em] text-white">Semana de corrida</span>}
          </p>
          <h2 id={`corrida-${race.id}`} className="mt-2 text-3xl font-medium tracking-[-0.06em] sm:text-4xl">{race.gpName}</h2>
          <p className="mt-1 text-sm text-black/60">{[race.circuit, race.country].filter(Boolean).join(" · ")}</p>
          <div className="mt-6">
            <RaceCountdown raceStart={race.raceStart} />
          </div>
        </div>
        <Link href={raceCollectionHref(race)} className="group inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-xl bg-black px-6 text-sm font-medium text-white transition hover:bg-[#b94f01] lg:self-end">
          Ver a coleção do fim de semana <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
