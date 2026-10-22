import type { CSSProperties } from "react";
import { BlurReveal } from "@/components/ui/blur-reveal";
import type { DriverContent } from "@/lib/content/drivers";

// Texto editorial da página do piloto (fase 4; reorganizado no refino 2): trajetória e números (DriverCareer, depois
// dos produtos; os números abrem a seção) e estilo de pilotagem (DriverExtras, ao lado da foto secundária), com BlurReveal
// nos títulos. A frase de abertura e as curiosidades ficam no topo (components/driver-intro.tsx, feat/carros A2). Tudo fica abaixo da dobra e anima só ao
// entrar na tela (inView): quando o visitante chega aqui, o JS já carregou (o texto está no HTML para buscadores).
// A cor da equipe aparece só como detalhe (fios e marcadores), nunca como cor de texto.

const title = "font-display text-3xl tracking-[-0.04em] text-black sm:text-4xl";

/**
 * História e números (logo depois dos produtos). Com o carro no topo (`numbersFirst`), o bloco "frase + 3 números +
 * botão" não existe lá em cima e os números abrem esta seção, antes da trajetória; sem carro, ficam depois dela.
 */
export function DriverCareer({ content, color, name, numbersFirst = false }: { content: DriverContent; color: string; name: string; numbersFirst?: boolean }) {
  const numbers = (
    // Números: grandes, na Archivo, com o fio na cor da equipe. dt antes dos dd no HTML; o número aparece primeiro.
    <section aria-label={`${name} em números`} className={numbersFirst ? "" : "mt-16 sm:mt-24"}>
      <dl className={`grid grid-cols-2 gap-x-6 gap-y-10 ${content.facts.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {content.facts.map((fact) => (
          <div key={fact.label} className="flex flex-col border-t-2 pt-5" style={{ borderColor: "var(--team)" }}>
            <dt className="order-2 mt-3 text-sm font-semibold text-black">{fact.label}</dt>
            <dd className="order-1 font-display text-5xl leading-none tracking-[-0.05em] text-black sm:text-6xl lg:text-7xl">{fact.value}</dd>
            {fact.detail && <dd className="order-3 mt-1 text-sm leading-6 text-black/60">{fact.detail}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
  return (
    <div className="mx-auto max-w-[1400px]" style={{ "--team": color } as CSSProperties}>
      {numbersFirst && numbers}
      <section aria-labelledby="trajetoria" className={`grid gap-8 border-t border-black/10 pt-12 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16 md:pt-16 ${numbersFirst ? "mt-16 sm:mt-24" : ""}`}>
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

      {!numbersFirst && numbers}
    </div>
  );
}

/** Estilo de pilotagem e a nota de texto independente (ao lado da foto secundária). As curiosidades ficam no topo. */
export function DriverExtras({ content, name }: { content: DriverContent; name: string }) {
  return (
    <div>
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
      <p className="mt-14 max-w-[65ch] text-xs leading-5 text-black/60">
        Texto editorial independente, escrito por fãs. Sem vínculo com {name} ou com a equipe.
      </p>
    </div>
  );
}
