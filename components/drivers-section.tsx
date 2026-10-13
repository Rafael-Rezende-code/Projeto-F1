"use client";

import { useState, type FocusEvent } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { HoverTransition } from "@/components/ui/hover-transition";
import { drivers, type Driver } from "@/lib/drivers";

// Largura do card: 1 coluna em carrossel (<640px), 2 colunas (<1024px), 4 colunas (máx. 1400px).
const IMAGE_SIZES = "(min-width: 1480px) 340px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 80vw";

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

  return (
    <li className="w-[80%] shrink-0 snap-start sm:w-auto">
      <div className="relative aspect-[4/5]">
        <HoverTransition
          aria-hidden="true"
          tabIndex={-1}
          active={hovered || focused}
          effect="wipe"
          direction="right"
          duration={0.7}
          label={driver.name}
          className="h-full min-h-0"
          defaultComponent={<DefaultFace driver={driver} />}
          hoverComponent={<HoverFace driver={driver} />}
        />
        <a
          href={driver.href}
          className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
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

export function DriversSection() {
  return (
    <section id="pilotos" aria-labelledby="pilotos-titulo" className="bg-white px-5 py-20 sm:px-10 sm:py-28">
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">Os pilotos</p>
        <h2 id="pilotos-titulo" className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl">
          Escolha seu piloto
        </h2>
        <ul
          role="list"
          className="-mx-5 mt-12 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 py-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4"
        >
          {drivers.map((driver) => (
            <DriverCard key={driver.slug} driver={driver} />
          ))}
        </ul>
      </div>
    </section>
  );
}
