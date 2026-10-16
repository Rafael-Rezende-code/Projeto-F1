"use client";

import { useReducedMotion } from "motion/react";
import { Signature } from "@/components/ui/signature";

// Nome do piloto "escrito à mão" com o Signature da Spell UI (components/ui/signature.tsx): o contorno de cada letra é
// desenhado como um traço de caneta (pathLength), da esquerda para a direita, e o preenchimento vem logo atrás.
// Fonte manuscrita GENÉRICA: Great Vibes (SIL OFL), subconjunto latino em public/fonts/greatvibes-latin.woff.
// Duração fixa para qualquer nome (o traço termina em 2,6 s; o preenchimento, que vem pela máscara, completa ~2,2 s): cada letra leva DRAW s e o intervalo entre letras se ajusta.
// Uma vez ao entrar na tela; com prefers-reduced-motion aparece pronto.
// REGRA FIXA: efeito tipográfico genérico; NUNCA imitar o autógrafo real do piloto (ver CLAUDE.md).
const TOTAL = 2.6;
const DRAW = 1.1;
const DELAY = 0.1;

export function DriverSignature({ name, className = "" }: { name: string; className?: string }) {
  const reduced = useReducedMotion();
  const letters = [...name].length;
  const stagger = letters > 1 ? (TOTAL - DELAY - DRAW) / (letters - 1) : 0;
  return (
    <span aria-hidden="true" className={`sig ${className}`}>
      <Signature
        text={name}
        color="#fff"
        fontSize={100}
        duration={DRAW}
        delay={DELAY}
        stagger={stagger}
        fontUrl="/fonts/greatvibes-latin.woff"
        inView
        once
        still={!!reduced}
        className="block h-auto max-w-full"
      />
    </span>
  );
}
