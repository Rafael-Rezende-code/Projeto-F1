import { NextRace } from "@/components/next-race";
import { nextRace } from "@/lib/calendar";
import { getRaceWeekends } from "@/lib/calendar-store";

// "Próxima corrida" nas páginas de piloto e equipe (loja extra, item 5). Sem corrida futura, nada aparece.
const renderTime = () => Date.now();

export async function NextRaceSlot({ className = "" }: { className?: string }) {
  const now = renderTime();
  const race = nextRace(await getRaceWeekends(), now);
  return race ? <NextRace race={race} now={now} className={className} /> : null;
}
