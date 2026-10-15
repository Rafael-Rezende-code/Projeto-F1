"use client";

import { Fragment, type JSX, type ReactNode } from "react";
import { useReveal } from "@/components/motion/use-reveal";
import { STAGGER_CAP } from "@/lib/motion";

// Entrada de texto por palavra (fade + subida curta), uma vez, ao rolar até o texto. Usado pelos títulos de seção
// (SectionTitle) e por parágrafos de destaque. Só opacity/transform; atraso máximo de STAGGER_CAP palavras
// (o resto entra junto), então o texto nunca fica invisível por muito tempo. Ver tokens em lib/motion.ts.
export function splitWords(text: string, offset = 0) {
  return text.split(" ").filter(Boolean).map((word, index) => ({ word, i: Math.min(index + offset, STAGGER_CAP) }));
}

export function Word({ i, children }: { i: number; children: ReactNode }) {
  return (
    <span className="rw" style={{ "--i": i } as React.CSSProperties}>
      {children}
    </span>
  );
}

export function RevealText({ as = "p", text, className }: { as?: keyof JSX.IntrinsicElements; text: string; className?: string }) {
  const ref = useReveal<HTMLElement>("revealText");
  const Tag = as as "p";
  const words = splitWords(text);
  return (
    <Tag ref={ref as React.Ref<HTMLParagraphElement>} className={className}>
      {words.map(({ word, i }, index) => (
        <Fragment key={index}>
          <Word i={i}>{word}</Word>
          {index < words.length - 1 && " "}
        </Fragment>
      ))}
    </Tag>
  );
}

/** Várias linhas (cada uma com sua classe) num só bloco, com a sequência de palavras contínua entre as linhas. */
export function RevealLines({ as = "h2", lines, className }: { as?: "h1" | "h2" | "p"; lines: { text: string; className?: string }[]; className?: string }) {
  const ref = useReveal<HTMLHeadingElement>("revealText");
  const Tag = as as "h2";
  // Índice inicial de cada linha = total de palavras das anteriores (sequência contínua).
  const starts = lines.map((_, l) => lines.slice(0, l).reduce((sum, line) => sum + splitWords(line.text).length, 0));
  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, l) => {
        const words = splitWords(line.text, starts[l]);
        return (
          <span key={l} className={line.className}>
            {words.map(({ word, i }, index) => (
              <Fragment key={index}>
                <Word i={i}>{word}</Word>
                {index < words.length - 1 && " "}
              </Fragment>
            ))}
          </span>
        );
      })}
    </Tag>
  );
}
