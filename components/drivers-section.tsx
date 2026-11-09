"use client";

import { memo, useState, type FocusEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ImageReveal } from "@/components/motion/image-reveal";
import { RevealGroup } from "@/components/motion/reveal-group";
import { driverTransitionName, SharedTransition } from "@/components/motion/view-transition";
import { SectionTitle } from "@/components/motion/section-title";
import { HoverTransition } from "@/components/ui/hover-transition";
import { GoldChampionCard } from "@/components/campeao/gold-champion-card";
import type { CampeaoCardVariant } from "@/lib/campeao";
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

function DefaultFace({ driver, blur }: { driver: Driver; blur?: string }) {
  return (
    <div className="relative h-full w-full bg-[#e9e8e4]">
      {/* Placeholder desfocado + entrada sutil (fade) se a foto ainda não carregou (fase 1 da rodada de conteúdo). */}
      <ImageReveal className="absolute inset-0">
        <Image
          src={driver.image}
          alt=""
          fill
          sizes={IMAGE_SIZES}
          quality={IMAGE_QUALITY}
          className="object-cover"
          style={{ objectPosition: driver.imagePosition }}
          {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
        />
      </ImageReveal>
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

function DriverCard({ driver, blur }: { driver: Driver; blur?: string }) {
  // Hover só com mouse (no toque o link navega direto) e foco só via teclado (focus-visible).
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;
  const duration = driver.duration ?? driverHoverTransition.duration;
  const easing = driver.easing ?? driverHoverTransition.easing;

  return (
    <li className="w-[80%] shrink-0 snap-start sm:w-auto">
      <SharedTransition name={driverTransitionName(driver.slug)} crossfade={false}>
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
          defaultComponent={<DefaultFace driver={driver} blur={blur} />}
          hoverComponent={<HoverFace driver={driver} />}
        />
        <Link
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
        </Link>
      </div>
      </SharedTransition>
    </li>
  );
}

// Lista dos cards. O campeão (card dourado, components/campeao/gold-champion-card.tsx) vem sempre primeiro e FORA do
// carrossel: no celular, a largura toda; de 640 a 1023px, a linha inteira; a partir de 1024px, 2 colunas à esquerda com a
// altura dos 2 × 2 cards dos outros pilotos à direita (sem buraco na grade). Os demais: carrossel no celular, grade a
// partir de 640px. Usada na home (fundo com a bandeira) e em /pilotos (foto do pódio, título h2).
export function DriverCardList({
  className = "",
  blurs = {},
  champion = "home",
  championHeading = "h3",
}: {
  className?: string;
  /** placeholders desfocados por slug (lib/driver-card-blurs.ts); o card do campeão usa "campeao-home"/"campeao-pilotos" */
  blurs?: Record<string, string>;
  champion?: CampeaoCardVariant;
  championHeading?: "h2" | "h3";
}) {
  const hasChampion = drivers.some((driver) => driver.champion);
  return (
    <div className={`grid grid-cols-1 gap-3 lg:grid-cols-4 ${className}`}>
      {hasChampion && <GoldChampionCard variant={champion} headingLevel={championHeading} blur={blurs[`campeao-${champion}`]} className="lg:col-span-2" />}
      <RevealGroup
        role="list"
        aria-label="Pilotos"
        className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 py-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:py-0 lg:col-span-2 lg:grid-cols-2"
      >
        {drivers.filter((driver) => !driver.champion).map((driver) => (
          <DriverCard key={driver.slug} driver={driver} blur={blurs[driver.slug]} />
        ))}
      </RevealGroup>
    </div>
  );
}

// memo: a página re-renderiza a cada frame (spotlight do hero); as props não mudam, a seção não precisa acompanhar.
export const DriversSection = memo(function DriversSection({ blurs }: { blurs?: Record<string, string> }) {
  return (
    <section id="pilotos" aria-labelledby="pilotos-titulo" className="bg-white px-5 pb-12 pt-20 sm:px-10 sm:pb-16 sm:pt-28">
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Os pilotos</p>
        <SectionTitle id="pilotos-titulo" text="Escolha seu piloto" className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl" />
        <DriverCardList className="mt-12" blurs={blurs} />
      </div>
    </section>
  );
});
