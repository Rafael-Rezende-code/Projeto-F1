import type { CSSProperties } from "react";
import { CueReveal } from "@/components/motion/cue-reveal";
import type { DriverContent } from "@/lib/content/drivers";

// Topo da página do piloto SEM carro (refino 2): no espaço ao lado da assinatura, a frase de abertura, 3 números em
// destaque (Archivo grande) e "Ver a coleção ↓", que rola até os produtos. Entra coreografado depois da assinatura
// (CueReveal, sinal da foto principal). Com o PNG do carro, o carro ocupa o espaço e este bloco não aparece.
// Cores: `textColor` (branco sólido ou preto, ≥ 4,5:1 sobre a cor da equipe, lib/contrast.ts) no texto pequeno; números
// grandes em branco (texto grande: o mínimo é 3:1, e todas as equipes passam).
export function DriverIntro({ content, textColor, cue, delay }: { content: DriverContent; textColor: string; cue: string; delay: number }) {
  return (
    <CueReveal cue={cue} delay={delay} className="w-full max-w-[520px]" style={{ "--intro-text": textColor } as CSSProperties}>
      <p className="text-xl leading-snug tracking-[-0.02em] [color:var(--intro-text)] sm:text-2xl">{content.opening}</p>
      <dl className="mt-8 grid grid-cols-3 gap-4 border-t pt-5 [border-color:color-mix(in_srgb,var(--intro-text)_35%,transparent)]">
        {content.facts.slice(0, 3).map((fact) => (
          <div key={fact.label} className="flex flex-col">
            <dt className="order-2 mt-2 text-xs leading-4 [color:var(--intro-text)]">{fact.label}</dt>
            <dd className="order-1 font-display text-4xl leading-none tracking-[-0.05em] text-white sm:text-5xl">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <a
        href="#produtos-piloto"
        className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        Ver a coleção <span aria-hidden="true">↓</span>
      </a>
    </CueReveal>
  );
}
