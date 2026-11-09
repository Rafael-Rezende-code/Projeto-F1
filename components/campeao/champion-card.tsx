import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CampeaoSelo } from "@/components/campeao/selo";
import { driverTransitionName, SharedTransition } from "@/components/motion/view-transition";
import type { Driver } from "@/lib/drivers";

// Card DOURADO do campeão (Sessão do Campeão): sempre o primeiro da lista de pilotos (home e /pilotos). No carrossel do
// celular é um slide 4:5 como os outros (foto + painel dourado embaixo); a partir de 640px ocupa a linha inteira, com a
// foto à esquerda e o painel à direita. Leva à página do piloto (em modo campeão). Fica depois de CAMPEAO_DESTAQUE_ATE.
// Contraste: texto preto sobre o dourado (o tom mais escuro do degradê, #a9802f, ainda dá 4,7:1).
const IMAGE_SIZES = "(min-width: 1480px) 560px, (min-width: 640px) 40vw, 80vw";

export function ChampionCard({ driver, blur }: { driver: Driver; blur?: string }) {
  const [first, ...rest] = driver.name.split(" ");
  return (
    <li className="w-[80%] shrink-0 snap-start sm:col-span-2 sm:w-auto lg:col-span-4">
      <Link
        href={driver.href}
        className="group relative isolate flex aspect-[4/5] flex-col overflow-hidden rounded-2xl bg-[#0d0d0d] text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black sm:grid sm:aspect-auto sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:min-h-[420px]"
      >
        <SharedTransition name={driverTransitionName(driver.slug)} crossfade={false}>
          <div className="relative min-h-0 flex-1 overflow-hidden sm:aspect-[4/5] sm:flex-none lg:aspect-auto">
            <Image
              src={driver.image}
              alt=""
              fill
              sizes={IMAGE_SIZES}
              quality={90}
              className="object-cover transition-transform duration-[var(--motion-long)] ease-[var(--ease-out)] group-hover:scale-[1.04]"
              style={{ objectPosition: driver.imagePosition }}
              {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
            />
          </div>
        </SharedTransition>
        <div className="campeao-ouro relative flex flex-col justify-between gap-4 p-5 sm:p-8 lg:p-10">
          <div className="flex items-start justify-between gap-4">
            <p className="font-campeao-mono text-[10px] uppercase tracking-[0.24em] sm:text-[11px]">
              Campeão mundial {driver.champion?.year}
            </p>
            <CampeaoSelo className="campeao-selo-card relative hidden shrink-0 sm:block" />
          </div>
          <div>
            <p className="leading-[0.9]">
              <span className="font-playfair block text-2xl italic tracking-[-0.04em] sm:text-4xl">{first}</span>
              <span className="block text-4xl font-medium tracking-[-0.06em] sm:text-6xl lg:text-7xl">{rest.join(" ")}</span>
            </p>
            <p className="mt-3 max-w-[34ch] text-sm leading-6 sm:mt-5 sm:text-base">
              {driver.team} · {driver.phrase}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] sm:mt-6">
              Ver o campeão <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}
