"use client";

import type { JSX } from "react";
import { BlurReveal } from "@/components/ui/blur-reveal";
import { HighlightedText } from "@/components/ui/highlighted-text";
import { duration, stagger } from "@/lib/motion";

// Título de seção com entrada padrão (BlurReveal: letras saem do desfoque), uma única vez, ao entrar na tela.
// `highlight` (opcional) marca UMA palavra do título com o HighlightedText na cor de destaque (#b94f01).
// Regra: HighlightedText em no máximo 3 lugares do site (ver CLAUDE.md).
const speedReveal = 0.03 / stagger.letters; // BlurReveal: stagger = 0.03 / speedReveal
const speedSegment = 0.3 / duration.base; // BlurReveal: duração por letra = 0.3 / speedSegment

function Blur({ text }: { text: string }) {
  if (!text) return null;
  return (
    <BlurReveal as="span" inView once speedReveal={speedReveal} speedSegment={speedSegment}>
      {text}
    </BlurReveal>
  );
}

export function SectionTitle({
  text,
  highlight,
  as = "h2",
  id,
  className,
}: {
  text: string;
  highlight?: string;
  as?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
}) {
  const Tag = as as keyof JSX.IntrinsicElements;
  const at = highlight ? text.indexOf(highlight) : -1;
  if (at < 0) {
    return (
      <Tag id={id} className={className}>
        <Blur text={text} />
      </Tag>
    );
  }
  const before = text.slice(0, at);
  const after = text.slice(at + highlight!.length);
  return (
    <Tag id={id} className={className}>
      <Blur text={before.trimEnd()} />
      {before.endsWith(" ") && " "}
      {/* Barra na cor de destaque e texto branco: sem o mix-blend do original (com laranja, ele inverteria a cor). */}
      <HighlightedText inView once delay={0.25} className="[&>span:first-child]:bg-[#b94f01] [&>span:last-child]:mix-blend-normal">
        {highlight}
      </HighlightedText>
      {after.startsWith(" ") && " "}
      <Blur text={after.trimStart()} />
    </Tag>
  );
}
