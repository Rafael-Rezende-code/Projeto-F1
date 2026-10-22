"use client";

import { useReducedMotion } from "motion/react";
import { useCue } from "@/components/motion/cue";
import { Signature } from "@/components/ui/signature";
import { choreography } from "@/lib/motion";
import type { SignatureData } from "@/lib/signature-paths";

// Nome do piloto "escrito à mão" com o Signature da Spell UI (components/ui/signature.tsx): o contorno de cada letra é
// desenhado como um traço de caneta (pathLength), da esquerda para a direita, e o preenchimento vem logo atrás.
// Os contornos chegam prontos do servidor (lib/signature-paths.ts, Great Vibes, manuscrita GENÉRICA): o navegador não
// baixa fonte nem opentype.js. Duração fixa para qualquer nome (o traço termina em 2,6 s; o preenchimento, que vem pela
// máscara, completa ~2,2 s): cada letra leva DRAW s e o intervalo entre letras se ajusta.
// Uma vez ao entrar na tela; com prefers-reduced-motion aparece pronto.
// `after`: espera esse sinal (components/motion/cue.ts) — na página do piloto, a foto principal começa a aparecer e a
// assinatura entra AFTER_DELAY depois (foto primeiro, assinatura depois). Sem o sinal em 2,5 s, entra assim mesmo.
// REGRA FIXA: efeito tipográfico genérico; NUNCA imitar o autógrafo real do piloto (ver CLAUDE.md).
const TOTAL = 2.6;
const DRAW = 1.1;
const DELAY = 0.1;
const AFTER_DELAY = choreography.signatureStart;

export function DriverSignature({ signature, className = "", after }: { signature: SignatureData; className?: string; after?: string }) {
  const reduced = useReducedMotion();
  const ready = useCue(after);
  const letters = signature.paths.length;
  const stagger = letters > 1 ? (TOTAL - DELAY - DRAW) / (letters - 1) : 0;
  return (
    <span aria-hidden="true" className={`sig ${className}`}>
      <Signature
        paths={signature.paths}
        box={signature.box}
        color="#fff"
        duration={DRAW}
        delay={after ? AFTER_DELAY : DELAY}
        stagger={stagger}
        inView
        once
        play={after ? ready : undefined}
        still={!!reduced}
        className="block h-auto max-w-full"
      />
    </span>
  );
}
