"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef, type ElementType } from "react";
import { useReducedMotion } from "motion/react";
import { useCue } from "@/components/motion/cue";
import { STAGGER_CAP } from "@/lib/motion";

type Props<T extends ElementType> = {
  as?: T;
  /** Sinal (components/motion/cue.ts) que libera a entrada. */
  cue: string;
  /** Espera depois do sinal, em segundos (com reduced motion vira `reducedDelay`). */
  delay?: number;
  reducedDelay?: number;
} & ComponentPropsWithoutRef<T>;

// Entrada coreografada: os filhos ficam escondidos (CSS [data-reveal="pending"], o mesmo do RevealGroup) e entram
// escalonados `delay` segundos depois do sinal `cue`. Usado no topo da página do piloto: foto → assinatura → carro ou
// miniaturas. Sem JavaScript, <noscript> mostra tudo.
export function CueReveal<T extends ElementType = "div">({ as, cue, delay = 0, reducedDelay = 0.3, children, ...rest }: Props<T>) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  const ready = useCue(cue, 4000);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    [...el.children].forEach((child, index) => (child as HTMLElement).style.setProperty("--i", String(Math.min(index, STAGGER_CAP))));
    if (!ready) return;
    const timer = window.setTimeout(() => (el.dataset.reveal = "in"), (reduced ? reducedDelay : delay) * 1000);
    return () => window.clearTimeout(timer);
  }, [ready, delay, reducedDelay, reduced]);

  return (
    <Tag ref={ref} data-reveal="pending" data-cue-reveal="" {...rest}>
      {children}
      <noscript>
        <style>{"[data-cue-reveal]>*{opacity:1!important;transform:none!important}"}</style>
      </noscript>
    </Tag>
  );
}
