"use client";

import { Fragment } from "react";
import { HighlightWord } from "@/components/motion/highlight-word";
import { splitWords, Word } from "@/components/motion/reveal-text";
import { useReveal } from "@/components/motion/use-reveal";

// Título de seção com a entrada padrão do site: palavras sobem e aparecem em sequência curta, uma vez, ao rolar até
// ele (só opacity/transform; o que já está na tela ao carregar aparece pronto). Ver lib/motion.ts.
// `highlight` (opcional) marca UMA palavra com o destaque laranja (HighlightWord: barra #b94f01 e palavra branca).
// Regra: destaque em no máximo 3 lugares do site (ver CLAUDE.md).
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
  const ref = useReveal<HTMLHeadingElement>("revealText");
  const Tag = as;
  const words = splitWords(text);
  return (
    <Tag ref={ref} id={id} className={className}>
      {words.map(({ word, i }, index) => {
        // A palavra destacada pode vir com pontuação colada ("corrida."): destaca só a palavra.
        const at = highlight ? word.indexOf(highlight) : -1;
        return (
          <Fragment key={index}>
            <Word i={i}>
              {at >= 0 ? (
                <>
                  {word.slice(0, at)}
                  <HighlightWord>{highlight!}</HighlightWord>
                  {word.slice(at + highlight!.length)}
                </>
              ) : (
                word
              )}
            </Word>
            {index < words.length - 1 && " "}
          </Fragment>
        );
      })}
    </Tag>
  );
}
