import { CountUp } from "@/components/motion/count-up";
import { CAMPEAO_BANDEIRA_TEXT, CAMPEAO_IMAGES, CAMPEAO_NUMBERS } from "@/lib/campeao";

// Capítulo 2 da Sessão do Campeão: a bandeira. Seção escura; o palco segue a proporção da imagem (16:9 no desktop; no
// celular a versão vertical 4:5, object-fit cover centralizado, sem cortar o topo, onde fica o texto embutido) e as bordas
// laterais esmaecem para o preto. Zoom lento (1 → 1,07 em 18 s, origem no topo: o texto de cima nunca é cortado) e uma
// varredura de luz suave (screen, opacidade baixa). Só transform/opacity. Animações sempre ligadas (não movem a tela).
export function CampeaoBandeira() {
  const flag = CAMPEAO_IMAGES.flag;
  const vertical = CAMPEAO_IMAGES.flagVertical;
  return (
    <section id="bandeira" aria-labelledby="bandeira-titulo" className="campeao-bandeira bg-[#0b0b0c] text-white">
      <div className="campeao-bandeira-palco">
        <picture>
          <source media="(max-width: 767px)" type="image/avif" srcSet={vertical.avif} sizes="100vw" />
          <source media="(max-width: 767px)" type="image/webp" srcSet={vertical.webp} sizes="100vw" />
          <source type="image/avif" srcSet={flag.avif} sizes="min(100vw, 177.78svh)" />
          <source type="image/webp" srcSet={flag.webp} sizes="min(100vw, 177.78svh)" />
          <img
            src={flag.fallback}
            alt="Kimi Antonelli olha para o alto, enrolado na bandeira da Itália, com a medalha no peito. Texto na imagem: First Italian champion in 73 years. Bellissimo."
            width={flag.width}
            height={flag.height}
            loading="lazy"
            decoding="async"
            className="campeao-bandeira-img"
          />
        </picture>
        <span className="campeao-bandeira-luz" aria-hidden="true" />
      </div>

      <div className="mx-auto max-w-[1400px] px-5 pb-20 pt-14 sm:px-10 sm:pb-28 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-end lg:gap-16">
          <div>
            <p className="font-campeao-mono text-[11px] uppercase tracking-[0.28em] text-[#e9cf8f]">{CAMPEAO_BANDEIRA_TEXT.eyebrow}</p>
            <h2 id="bandeira-titulo" className="mt-4 text-5xl font-medium tracking-[-0.06em] sm:text-6xl">
              {CAMPEAO_BANDEIRA_TEXT.title}
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">{CAMPEAO_BANDEIRA_TEXT.body}</p>
        </div>

        <dl className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-white/12 sm:grid-cols-3">
          {CAMPEAO_NUMBERS.map((item) => (
            <div key={item.label} className="flex flex-col bg-[#0b0b0c] p-6 sm:p-8">
              <dt className="order-2 mt-3 max-w-[28ch] text-sm leading-6 text-white/70">{item.label}</dt>
              <dd className="order-1 flex items-baseline gap-2">
                <CountUp value={item.value} className="font-display text-6xl tracking-[-0.05em] text-[#e9cf8f] sm:text-7xl" />
                {item.unit && <span className="text-sm uppercase tracking-[0.18em] text-white/70">{item.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
