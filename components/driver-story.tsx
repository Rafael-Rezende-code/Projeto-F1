import type { CSSProperties } from "react";
import { BlurReveal } from "@/components/ui/blur-reveal";
import { WordsStagger } from "@/components/ui/words-stagger";
import type { DriverContent } from "@/lib/content/drivers";

// Texto editorial da página do piloto (fase 4): abertura (WordsStagger), trajetória, números em destaque (Archivo
// grande), estilo de pilotagem e curiosidades, com BlurReveal nos títulos. Tudo fica abaixo da dobra e anima só ao
// entrar na tela (inView): quando o visitante chega aqui, o JS já carregou (o texto está no HTML para buscadores).
// A cor da equipe aparece só como detalhe (fios e marcadores), nunca como cor de texto.

const title = "font-display text-3xl tracking-[-0.04em] text-black sm:text-4xl";

export function DriverOpening({ text }: { text: string }) {
  return (
    <WordsStagger inView once stagger={0.05} speed={0.45} className="mt-5 text-2xl leading-[1.25] tracking-[-0.03em] text-black sm:text-3xl">
      {text}
    </WordsStagger>
  );
}

export function DriverStory({ content, color, name }: { content: DriverContent; color: string; name: string }) {
  return (
    <div className="mx-auto max-w-[1400px]" style={{ "--team": color } as CSSProperties}>
      {/* Trajetória: título à esquerda, texto em coluna de leitura (~65 caracteres). */}
      <section aria-labelledby="trajetoria" className="grid gap-8 border-t border-black/10 pt-12 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16 md:pt-16">
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-black/60">Trajetória</p>
          <BlurReveal as="h2" inView once className={title}>
            {`A história de ${name.split(" ")[0]}`}
          </BlurReveal>
          <span id="trajetoria" className="sr-only">Trajetória de {name}</span>
        </div>
        <div className="max-w-[65ch] space-y-5 text-base leading-8 text-black/80 sm:text-[17px]">
          {content.career.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
      </section>

      {/* Números: grandes, na Archivo, com o fio na cor da equipe. */}
      <section aria-label={`${name} em números`} className="mt-16 sm:mt-24">
        <dl className={`grid grid-cols-2 gap-x-6 gap-y-10 ${content.facts.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {content.facts.map((fact) => (
            // dt antes dos dd no HTML (ordem válida de <dl>); o número aparece primeiro só visualmente (order).
            <div key={fact.label} className="flex flex-col border-t-2 pt-5" style={{ borderColor: "var(--team)" }}>
              <dt className="order-2 mt-3 text-sm font-semibold text-black">{fact.label}</dt>
              <dd className="order-1 font-display text-5xl leading-none tracking-[-0.05em] text-black sm:text-6xl lg:text-7xl">{fact.value}</dd>
              {fact.detail && <dd className="order-3 mt-1 text-sm leading-6 text-black/60">{fact.detail}</dd>}
            </div>
          ))}
        </dl>
      </section>

      {/* Estilo e curiosidades lado a lado no desktop. */}
      <div className="mt-16 grid gap-14 sm:mt-24 lg:grid-cols-2 lg:gap-20">
        <section aria-labelledby="estilo">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-black/60">Na pista</p>
          <BlurReveal as="h2" inView once className={title}>
            Estilo de pilotagem
          </BlurReveal>
          <span id="estilo" className="sr-only">Estilo de pilotagem de {name}</span>
          <div className="mt-6 max-w-[65ch] space-y-5 text-base leading-8 text-black/80 sm:text-[17px]">
            {content.style.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
        </section>
        <section aria-labelledby="curiosidades">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-black/60">Fora do cockpit</p>
          <BlurReveal as="h2" inView once className={title}>
            Curiosidades
          </BlurReveal>
          <span id="curiosidades" className="sr-only">Curiosidades sobre {name}</span>
          <ol className="mt-6 space-y-6">
            {content.trivia.map((item, index) => (
              <li key={item.slice(0, 24)} className="flex gap-5">
                <span aria-hidden="true" className="font-display w-8 shrink-0 text-xl leading-7 tracking-[-0.04em]" style={{ color: "var(--team)" }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="max-w-[56ch] text-base leading-7 text-black/80">{item}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <p className="mt-16 max-w-[65ch] text-xs leading-5 text-black/60">
        Texto editorial independente, escrito por fãs. Sem vínculo com {name} ou com a equipe.
      </p>
    </div>
  );
}
