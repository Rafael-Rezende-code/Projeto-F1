"use client";

import { memo, useState, type FocusEvent } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { RevealGroup } from "@/components/motion/reveal-group";
import { SectionTitle } from "@/components/motion/section-title";
import { HoverTransition } from "@/components/ui/hover-transition";
import { driverHoverTransition, drivers, type Driver } from "@/lib/drivers";

// Largura real do card em cada breakpoint (o navegador multiplica pelo DPR para escolher a imagem):
// ≥1480: 4 colunas no máx. de 1400px − 3 gaps de 12px = 341px; ≥1024: 4 colunas em 100vw − 80px de padding;
// ≥640: 2 colunas (1 gap); abaixo: carrossel com cards de 80% de (100vw − 40px).
// × 1,5 (sobreamostragem, medida): o navegador borra ao reduzir a foto numa proporção perto de 1:1
// (ex.: 750→654px). Com 1,5× ele escolhe uma fonte maior e mais nítida, limitada pelo Next ao original (1024px).
const IMAGE_SIZES =
  "(min-width: 1480px) 512px, (min-width: 1024px) calc((100vw - 116px) / 4 * 1.5), (min-width: 640px) calc((100vw - 92px) / 2 * 1.5), calc((80vw - 32px) * 1.5)";
const IMAGE_QUALITY = 90;

function splitName(name: string) {
  const [first, ...rest] = name.split(" ");
  return { first, last: rest.join(" ") };
}

function isFocusVisible(event: FocusEvent<HTMLElement>) {
  try {
    return event.currentTarget.matches(":focus-visible");
  } catch {
    return true;
  }
}

function DefaultFace({ driver }: { driver: Driver }) {
  return (
    <div className="relative h-full w-full bg-[#e9e8e4]">
      <Image
        src={driver.image}
        alt=""
        fill
        sizes={IMAGE_SIZES}
        quality={IMAGE_QUALITY}
        className="object-cover"
        style={{ objectPosition: driver.imagePosition }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 via-35% to-transparent" />
      <div className="absolute inset-x-5 bottom-5 text-white">
        <p className="text-[10px] uppercase tracking-[0.16em] text-white/75">{driver.team}</p>
        <p className="mt-1 text-base font-medium tracking-[-0.04em] sm:text-lg">{driver.name}</p>
      </div>
    </div>
  );
}

function HoverFace({ driver }: { driver: Driver }) {
  const { first, last } = splitName(driver.name);
  const accent = driver.accent ?? driver.textColor;

  return (
    <div
      className="@container flex h-full w-full flex-col justify-between p-5 sm:p-6"
      style={{ backgroundColor: driver.color, color: driver.textColor }}
    >
      <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: accent }}>
        <span className="h-px w-6" style={{ backgroundColor: accent }} />
        {driver.team}
      </p>
      <div>
        <p className="leading-[0.9]">
          <span className="font-playfair block text-[10cqw] italic tracking-[-0.04em]">{first}</span>
          <span className="block text-[18cqw] font-medium tracking-[-0.07em]">{last}</span>
        </p>
        <p className="mt-4 max-w-[26ch] text-sm leading-6">{driver.phrase}</p>
        <span
          className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: accent }}
        >
          Ver coleção <ArrowRight size={16} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function DriverCard({ driver }: { driver: Driver }) {
  // Hover só com mouse (no toque o link navega direto) e foco só via teclado (focus-visible).
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;
  const duration = driver.duration ?? driverHoverTransition.duration;
  const easing = driver.easing ?? driverHoverTransition.easing;

  return (
    <li className="w-[80%] shrink-0 snap-start sm:w-auto">
      <div className="relative aspect-[4/5]">
        <HoverTransition
          aria-hidden="true"
          tabIndex={-1}
          active={active}
          // Anima sempre, inclusive com prefers-reduced-motion (decisão de produto, ver CLAUDE.md).
          respectReducedMotion={false}
          effect={driver.effect}
          direction={driver.direction}
          duration={duration}
          easing={easing}
          label={driver.name}
          className="h-full min-h-0 rounded-2xl"
          // Efeitos que escondem a foto (curtain) revelam este fundo; sem ele, a cor desbota sobre o branco.
          // Só existe enquanto ativo (e até a saída terminar): em repouso, deixaria um filete nos cantos.
          style={{
            backgroundColor: active ? driver.color : "transparent",
            transition: `background-color 0s linear ${active ? 0 : duration}s`,
          }}
          defaultComponent={<DefaultFace driver={driver} />}
          hoverComponent={<HoverFace driver={driver} />}
        />
        <a
          href={driver.href}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={(event) => setFocused(isFocusVisible(event))}
          onBlur={() => setFocused(false)}
        >
          <span className="sr-only">
            {driver.name}, {driver.team}. Ver coleção
          </span>
        </a>
      </div>
    </li>
  );
}

// Lista dos cards (carrossel no celular, grade a partir de 640px). Usada na home e em /pilotos.
export function DriverCardList({ className = "" }: { className?: string }) {
  return (
    <RevealGroup
      role="list"
      className={`-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 py-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 ${className}`}
    >
      {drivers.map((driver) => (
        <DriverCard key={driver.slug} driver={driver} />
      ))}
    </RevealGroup>
  );
}

// memo: a página re-renderiza a cada frame (spotlight do hero); sem props, a seção não precisa acompanhar.
export const DriversSection = memo(function DriversSection() {
  return (
    <section id="pilotos" aria-labelledby="pilotos-titulo" className="bg-white px-5 pb-12 pt-20 sm:px-10 sm:pb-16 sm:pt-28">
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Os pilotos</p>
        <SectionTitle id="pilotos-titulo" text="Escolha seu piloto" className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl" />
        <DriverCardList className="mt-12" />
      </div>
    </section>
  );
});
