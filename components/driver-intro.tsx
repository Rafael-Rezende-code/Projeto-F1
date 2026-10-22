import type { CSSProperties } from "react";
import { BlurReveal } from "@/components/ui/blur-reveal";
import type { DriverContent } from "@/lib/content/drivers";

// Texto do topo da página do piloto (feat/carros A2): a frase de abertura e 3 curiosidades curtas (lib/content/drivers).
// Com carro, fica dentro do DriverCar e é revelado pela passagem dele (estático no HTML, na ordem natural de leitura).
// Sem carro, entra com o BlurReveal padrão do site (DriverIntro). Os números ficam no início da história.
// Cor: `textColor` (branco sólido ou preto, ≥ 4,5:1 sobre a cor da equipe, lib/contrast.ts).
export function DriverTopText({ content, textColor }: { content: DriverContent; textColor: string }) {
  return (
    <div className="mt-6 md:mt-8" style={{ "--intro-text": textColor } as CSSProperties}>
      <p className="text-lg leading-snug tracking-[-0.02em] [color:var(--intro-text)] sm:text-xl">{content.opening}</p>
      <ul className="mt-5 space-y-2 border-t pt-4 text-sm leading-6 [border-color:color-mix(in_srgb,var(--intro-text)_35%,transparent)] [color:var(--intro-text)]">
        {content.trivia.slice(0, 3).map((item) => (
          <li key={item.slice(0, 24)} className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full [background:var(--intro-text)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Sem carro: o mesmo texto com a entrada padrão (BlurReveal, ao entrar na tela). */
export function DriverIntro({ content, textColor }: { content: DriverContent; textColor: string }) {
  return (
    <div className="max-w-[560px]" style={{ "--intro-text": textColor } as CSSProperties}>
      <BlurReveal inView once className="text-lg leading-snug tracking-[-0.02em] [color:var(--intro-text)] sm:text-xl">
        {content.opening}
      </BlurReveal>
      <ul className="mt-5 space-y-2 border-t pt-4 text-sm leading-6 [border-color:color-mix(in_srgb,var(--intro-text)_35%,transparent)] [color:var(--intro-text)]">
        {content.trivia.slice(0, 3).map((item, index) => (
          <li key={item.slice(0, 24)} className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full [background:var(--intro-text)]" />
            <BlurReveal as="span" inView once delay={0.15 * (index + 1)}>
              {item}
            </BlurReveal>
          </li>
        ))}
      </ul>
    </div>
  );
}
