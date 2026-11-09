import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PlayWhenVisible } from "@/components/campeao/play-when-visible";
import { GoldBeamBorder, GoldSheen, GoldText } from "@/components/ui/gold";
import { CAMPEAO, CAMPEAO_CARD, type CampeaoCardVariant } from "@/lib/campeao";

// Card de destaque DOURADO do campeão (feat/antonelli-2), sempre o primeiro da lista de pilotos (home e /pilotos).
// Ocupa 2 colunas (e a altura de 2 linhas de cards) a partir de 1024px; entre 640 e 1023px, a linha inteira em 16:9; no
// celular, a largura toda em 4:5, com a mesma hierarquia: "O CAMPEÃO" (serifa itálica dourada) → nome (GoldText) → linha
// → botão + link. Home: fundo com a bandeira e botão "Reviva a coroação"; /pilotos: a foto do pódio e botão para a ficha.
// Borda com feixe girando e um brilho passando de tempos em tempos, só com transform, pausados fora da tela
// (PlayWhenVisible). A serifa só baixa perto da tela (fallback Georgia enquanto pausado: .ouro-adiado).
// Contraste: o texto fica sobre o degradê preto da base (≥ 85%); ouro claro/branco sobre ~#000 passam de 7:1.
export function GoldChampionCard({
  variant,
  headingLevel = "h3",
  blur,
  className = "",
}: {
  variant: CampeaoCardVariant;
  headingLevel?: "h2" | "h3";
  blur?: string;
  className?: string;
}) {
  const card = CAMPEAO_CARD[variant];
  const Heading = headingLevel;
  const [first, ...rest] = CAMPEAO.name.split(" ");
  return (
    <PlayWhenVisible as="article" rootMargin="40% 0px" className={`gold-anim group/card ${className}`} aria-labelledby={`campeao-card-${variant}`}>
      {/* Celular: foto em cima (16:11, inteira) e o texto embaixo, sobre o preto (contraste garantido). A partir de 640px:
          texto sobre a foto, com o degradê. */}
      <GoldBeamBorder className="h-full" innerClassName="relative isolate flex flex-col sm:block sm:aspect-video lg:aspect-auto lg:h-full lg:min-h-[480px]">
        <div className="relative aspect-[16/11] overflow-hidden sm:absolute sm:inset-0 sm:aspect-auto">
          <Image
            src={card.image.src}
            alt={card.image.alt}
            fill
            sizes={card.sizes}
            quality={85}
            className="object-cover transition-transform duration-[var(--motion-long)] ease-[var(--ease-out)] group-hover/card:scale-[1.03]"
            style={{ objectPosition: card.image.position }}
            {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
          />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0b0b0c] via-[#0b0b0c]/0 via-35% sm:bg-gradient-to-r sm:from-black/90 sm:via-black/45 sm:via-50% sm:to-transparent lg:bg-gradient-to-t lg:from-black lg:via-black/55 lg:via-45%" />
        </div>
        <GoldSheen />
        <div className="relative z-[3] px-6 pb-7 pt-2 sm:absolute sm:inset-y-0 sm:left-0 sm:flex sm:max-w-[60%] sm:flex-col sm:justify-end sm:p-10 lg:inset-x-0 lg:top-auto lg:bottom-0 lg:max-w-none lg:p-10">
          <p className="font-ouro-serif ouro-adiado gold-text text-2xl uppercase tracking-[0.12em] sm:text-3xl">{CAMPEAO_CARD.eyebrow}</p>
          <Heading id={`campeao-card-${variant}`} className="mt-2 leading-[0.92]">
            <GoldText className="font-display block text-[clamp(2.75rem,11vw,5.5rem)] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
              {first} <span className="block">{rest.join(" ")}</span>
            </GoldText>
          </Heading>
          <p className="mt-4 max-w-[36ch] text-sm leading-6 text-white/85 sm:text-base">{CAMPEAO_CARD.line}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href={card.primary.href}
              className="group inline-flex min-h-11 items-center gap-2 rounded-xl bg-[linear-gradient(100deg,var(--ouro-escuro),var(--ouro)_35%,var(--ouro-claro)_60%,var(--ouro))] px-6 py-3 text-sm font-semibold text-[#1a1306] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8c36a]"
            >
              {card.primary.label} <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href={card.secondary.href}
              className="inline-flex min-h-11 items-center text-sm text-white/85 underline decoration-[#c8962c] underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8c36a]"
            >
              {card.secondary.label}
            </Link>
          </div>
        </div>
      </GoldBeamBorder>
    </PlayWhenVisible>
  );
}
