"use client";

import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/format";
import type { GlyphPortalStyle } from "@/components/ui/glyph-portal";
import { PATTERN_BOX, PATTERN_PATHS } from "@/lib/velocidade-pattern";

// Seção "VELOCIDADE" antes de "Luzes apagadas": a câmera entra numa letra e o vermelho toma a tela.
// ssr: false → o GlyphPortal só monta no cliente (o id do useId divergia entre servidor e cliente no v0).
// O placeholder reserva a altura do primeiro quadro (100svh) com o mesmo fundo, sem salto de layout.
// Reduced motion: o próprio componente fica estático e mostra o conteúdo direto (exceção registrada no CLAUDE.md).
// Nenhum ancestral pode ter overflow hidden/auto, transform ou filter: quebraria o position: sticky.
// O seletor "Escolha uma letra" (telas de toque) fica escondido por CSS (.velocidade-portal no globals.css), sem mexer
// no componente: a letra de entrada é a que ele escolhe sozinho (a de maior área de tinta).
const GlyphPortal = dynamic(() => import("@/components/ui/glyph-portal"), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="h-svh bg-[#f5f5f3]" />,
});

// Papel e tinta iguais à seção anterior ("O que o grid veste": fundo #f5f5f3, texto preto).
const portalStyle: GlyphPortalStyle = {
  "--gp-paper": "#f5f5f3",
  "--gp-ink": "#000000",
  "--gp-field": "#c8102e",
  "--gp-foreground": "#ffffff",
};

// Campo vermelho: gradiente próprio + padrão de linhas de fluxo (lib/velocidade-pattern.ts) dentro da MESMA camada que
// acompanha scale(var(--gp-field-scale)). Traço branco fino (1px fixo: vector-effect), opacidade 0,08, deriva lenta
// e contínua (32 s, só transform, CSS .vel-pattern no globals.css); parada com reduced motion. Nunca compete com o texto.
const field = (
  <div
    style={{
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      transform: "scale(var(--gp-field-scale,1))",
      background:
        "radial-gradient(circle at 18% 10%, rgba(255,120,90,.45), transparent 36%), radial-gradient(circle at 84% 22%, rgba(255,255,255,.10), transparent 28%), radial-gradient(circle at 50% 82%, rgba(90,0,16,.55), transparent 46%), linear-gradient(135deg,#a50d26 0%,#c8102e 48%,#7d0a1c 100%)",
    }}
  >
    <svg
      aria-hidden="true"
      className="vel-pattern"
      viewBox={`${PATTERN_BOX.x} ${PATTERN_BOX.y} ${PATTERN_BOX.width} ${PATTERN_BOX.height}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <g fill="none" stroke="#fff" strokeWidth={1} vectorEffect="non-scaling-stroke">
        {PATTERN_PATHS.map((d, index) => (
          <path key={index} d={d} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  </div>
);

// Conteúdo revelado (refino 2): texto à esquerda e uma VITRINE EDITORIAL de 2 produtos `featured` à direita, sem
// caixas: um grande (foto alta, ~60% da coluna) e um menor, mais baixo e sobreposto de leve; nome forte, preço em
// pílula e "Ver produto →". A altura das fotos (--vel-h) acompanha a tela (svh e vw), então cabe em 100svh em
// 1440×900 e 1280×720 sem tirar o segundo produto. Celular: carrossel com snap de slides grandes.
// Entrada escalonada pela própria revelação do portal (--gp-reveal em .vel-card) e clique só depois da entrada
// (o GlyphPortal libera o conteúdo com data-gp-entered=true). Hover: zoom suave (1,03) na foto.
export function VelocidadePortal({ products }: { products: Product[] }) {
  const showcase = products.slice(0, 2);
  return (
    <GlyphPortal word="VELOCIDADE" enterLabel="Entrar" scrollLength={2.2} style={portalStyle} background={field} className="velocidade-portal">
      <div className="grid w-full max-w-[1240px] items-center gap-10 justify-self-center lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
        <div>
          <h2 data-gp-default-title>Cada décimo conta.</h2>
          <p data-gp-default-copy>Peças feitas para quem sente a corrida antes mesmo da largada.</p>
          <a
            href="#collection"
            className="mt-8 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3 text-xs font-medium text-black transition hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Ver a coleção <span aria-hidden="true">→</span>
          </a>
        </div>
        {showcase.length > 0 && (
          <ul aria-label="Destaques da coleção" className="vel-showcase -mx-8 flex snap-x snap-mandatory scroll-px-8 gap-4 overflow-x-auto px-8 pb-2 [scrollbar-width:none] lg:mx-0 lg:items-start lg:overflow-visible lg:px-0 lg:pb-0">
            {showcase.map((product, index) => (
              <li key={product.slug} className={`vel-card ${index === 0 ? "vel-card--main" : "vel-card--side"} w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-auto`} style={{ "--i": index } as CSSProperties}>
                <Link href={`/produtos/${product.slug}`} className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                  <span className="vel-photo relative block overflow-hidden rounded-2xl bg-[#e9e8e4]">
                    <Image
                      src={product.images[0].src}
                      alt=""
                      fill
                      sizes={index === 0 ? "(min-width: 1024px) 420px, 78vw" : "(min-width: 1024px) 300px, 78vw"}
                      quality={80}
                      className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="vel-text block">
                  <span className="mt-4 block font-display text-xl leading-tight tracking-[-0.03em] text-white sm:text-2xl">{product.name}</span>
                  <span className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-md bg-white px-2.5 py-1 text-sm font-semibold text-black">{formatPrice(product.priceCents)}</span>
                    <span className="text-sm text-white underline-offset-4 group-hover:underline">
                      Ver produto <span aria-hidden="true">→</span>
                    </span>
                  </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlyphPortal>
  );
}
