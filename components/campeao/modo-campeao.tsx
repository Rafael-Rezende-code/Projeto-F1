import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CampeaoSelo } from "@/components/campeao/selo";
import { CountUp } from "@/components/motion/count-up";
import { CAMPEAO, CAMPEAO_RECORDS, CAMPEAO_TIMELINE } from "@/lib/campeao";

// "Modo campeão" da página do piloto campeão (/pilotos/antonelli): selo, faixa de recordes, linha do tempo curta de fatos
// confirmados (docs/conteudo/antonelli.md) e o link para /campeao. Fica logo abaixo do topo; os produtos dele vêm depois.
export function ModoCampeao() {
  return (
    <section aria-labelledby="modo-campeao-titulo" className="bg-[#e4dfdc] px-5 py-16 text-black sm:px-10 sm:py-24">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-5 sm:gap-7">
            <CampeaoSelo className="campeao-selo-modo relative shrink-0" />
            <div>
              <p className="font-campeao-mono text-[11px] uppercase tracking-[0.28em] text-black/70">Modo campeão</p>
              <h2 id="modo-campeao-titulo" className="mt-3 text-4xl font-medium tracking-[-0.06em] sm:text-6xl">
                Campeão mundial {CAMPEAO.year}
              </h2>
            </div>
          </div>
          <Link
            href={CAMPEAO.href}
            className="group inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-xl bg-[#0d0d0d] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#b88a2c] hover:text-black sm:self-auto"
          >
            Ver a coroação <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-black/10 sm:grid-cols-3">
          {CAMPEAO_RECORDS.map((item) => (
            <div key={item.label} className="flex flex-col bg-[#f1ece8] p-6 sm:p-8">
              <dt className="order-2 mt-3 max-w-[32ch] text-sm leading-6 text-black/70">{item.label}</dt>
              <dd className="order-1 flex items-baseline gap-2">
                <CountUp value={item.value} className="font-display text-6xl tracking-[-0.05em] sm:text-7xl" />
                {item.unit && <span className="text-sm uppercase tracking-[0.18em] text-black/70">{item.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>

        <ol className="mt-14 grid gap-8 border-t border-black/15 pt-10 md:grid-cols-3">
          {CAMPEAO_TIMELINE.map((item) => (
            <li key={item.title} className="relative pl-6">
              <span aria-hidden="true" className="absolute left-0 top-1.5 size-2.5 rounded-full bg-[#b88a2c]" />
              <p className="font-campeao-mono text-[11px] uppercase tracking-[0.2em] text-black/70">{item.date}</p>
              <h3 className="mt-2 text-xl font-medium tracking-[-0.03em]">{item.title}</h3>
              <p className="mt-2 max-w-[42ch] text-sm leading-6 text-black/70">{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
