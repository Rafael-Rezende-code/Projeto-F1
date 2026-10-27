import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DropCountdown } from "@/components/drop-status";
import { isReleased, launchLabel, type Drop } from "@/lib/drops";

// Bloco "Drops" da home (loja extra, item 6): só quando há drop ativo ou futuro (a home não chama sem drop). Até 2,
// o mais próximo primeiro, com contagem quando ainda não lançou.
export function DropsHome({ drops, now }: { drops: Drop[]; now: number }) {
  return (
    <section aria-labelledby="drops-titulo" className="bg-[#111] px-5 py-16 text-white sm:px-10 sm:py-20" data-drops-home>
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">Lançamentos</p>
            <h2 id="drops-titulo" className="text-4xl font-medium tracking-[-0.06em] sm:text-5xl">Drops</h2>
          </div>
          <Link href="/drops" className="group inline-flex min-h-11 items-center gap-2 text-sm text-white/75 underline-offset-4 transition hover:text-white hover:underline">
            Ver todos os drops <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <ul role="list" className="grid gap-3 lg:grid-cols-2">
          {drops.slice(0, 2).map((drop) => {
            const released = isReleased(drop, now);
            return (
              <li key={drop.slug} className="flex flex-col gap-5 rounded-2xl bg-white/[0.06] p-6 sm:p-8">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">{drop.mode === "pre_venda" ? "Pré-venda" : "Drop"} · {released ? "lançado" : launchLabel(drop.launchAt)}</p>
                  <h3 className="mt-2 text-3xl font-medium tracking-[-0.05em]">{drop.title}</h3>
                  {drop.mode === "pre_venda" && drop.shipEstimate && <p className="mt-1 text-sm text-white/75">Envio previsto: {drop.shipEstimate}</p>}
                </div>
                {!released && <DropCountdown launchAt={drop.launchAt} dark />}
                <Link href={`/drops/${drop.slug}`} className="inline-flex min-h-11 items-center justify-center self-start rounded-xl bg-white px-5 text-sm font-medium text-black transition hover:bg-[#b94f01] hover:text-white">
                  {released ? "Ver as peças" : "Entrar na lista de espera"}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
