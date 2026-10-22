import type { CSSProperties } from "react";
import { BlurReveal } from "@/components/ui/blur-reveal";
import { WordsStagger } from "@/components/ui/words-stagger";
import type { TeamContent } from "@/lib/content/teams";

// Texto editorial da página da equipe (fase 5), depois dos produtos (refino 2): abertura (WordsStagger), história em
// 2 parágrafos, sede e 3 marcos com o ano grande na Archivo. Mesmo padrão dos pilotos (components/driver-story.tsx):
// a cor da equipe só como detalhe (fios), BlurReveal no título, animação só ao entrar na tela.
export function TeamStory({ content, color, name }: { content: TeamContent; color: string; name: string }) {
  return (
    <section aria-labelledby="historia-equipe" className="mt-20 border-t border-black/10 pt-12 sm:mt-28 sm:pt-16" style={{ "--team": color } as CSSProperties}>
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-16">
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-black/60">A história</p>
          <BlurReveal as="h2" inView once className="font-display text-3xl tracking-[-0.04em] text-black sm:text-4xl">
            {`Sobre a ${name}`}
          </BlurReveal>
          <span id="historia-equipe" className="sr-only">História da {name}</span>
          <WordsStagger inView once stagger={0.05} speed={0.45} className="mt-6 text-2xl leading-[1.25] tracking-[-0.03em] text-black sm:text-[28px]">
            {content.opening}
          </WordsStagger>
          <p className="mt-8 flex items-center gap-2 text-sm text-black/70">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: "var(--team)" }} />
            <span>
              <span className="font-semibold text-black">Sede:</span> {content.hq}
            </span>
          </p>
        </div>
        <div className="max-w-[65ch] space-y-5 text-base leading-8 text-black/80 sm:text-[17px] md:pt-9">
          {content.history.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
      </div>
      <ol aria-label={`Marcos da ${name}`} className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
        {content.milestones.map((milestone) => (
          <li key={milestone.year} className="border-t-2 pt-5" style={{ borderColor: "var(--team)" }}>
            <p className="font-display text-4xl leading-none tracking-[-0.05em] text-black sm:text-5xl">{milestone.year}</p>
            <p className="mt-3 text-sm leading-6 text-black/70">{milestone.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-10 text-xs leading-5 text-black/60">Texto editorial independente, escrito por fãs. Sem vínculo com a {name}.</p>
    </section>
  );
}
