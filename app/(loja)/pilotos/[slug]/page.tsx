import type React from "react";
import Link from "next/link";
import { SectionTitle } from "@/components/motion/section-title";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DriverCar } from "@/components/driver-car";
import { DriverIntro } from "@/components/driver-intro";
import { DriverSignature } from "@/components/driver-signature";
import { DriverCareer, DriverExtras, DriverOpening } from "@/components/driver-story";
import { ImageReveal } from "@/components/motion/image-reveal";
import { driverTransitionName, SharedTransition } from "@/components/motion/view-transition";
import { ArtDirectedImage } from "@/components/ui/art-directed-image";
import { ProductGrid } from "@/components/product-grid";
import { catalog } from "@/lib/catalog";
import { getDriverContent } from "@/lib/content/drivers";
import { contrastRatio, readableTextOn } from "@/lib/contrast";
import { blurProps, findLocalImage, localImage } from "@/lib/local-images";
import { choreography } from "@/lib/motion";
import { signaturePaths } from "@/lib/signature-paths";

type Params = { params: Promise<{ slug: string }> };

// Coreografia do topo (segundos depois do sinal da foto principal, lib/motion.ts): foto → assinatura (0,45 s a ~3 s) →
// carro (ou o bloco de abertura, sem carro) quando o nome já está quase todo escrito.
const CAR_DELAY = choreography.carStart;
const INTRO_DELAY = choreography.introStart;

const SECOND_SIZES = "(min-width: 1480px) 680px, (min-width: 768px) calc(50vw - 72px), calc(100vw - 40px)";

export async function generateStaticParams() {
  const drivers = await catalog.getDrivers();
  return drivers.map((driver) => ({ slug: driver.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const driver = await catalog.getDriverBySlug((await params).slug);
  if (!driver) return { title: "Piloto não encontrado" };
  const description = `Coleção ${driver.name}: camisetas, bonés, miniaturas e pôsteres. ${driver.phrase}`;
  return {
    title: driver.name,
    description,
    alternates: { canonical: `/pilotos/${driver.slug}` },
    openGraph: { title: driver.name, description, images: [{ url: driver.image, alt: driver.name }] },
  };
}

export default async function DriverPage({ params }: Params) {
  const driver = await catalog.getDriverBySlug((await params).slug);
  if (!driver) notFound();
  const [team, products] = await Promise.all([catalog.getTeamBySlug(driver.teamSlug), catalog.getProducts({ driver: driver.slug })]);

  const main = driver.photoMain;
  const second = driver.photoSecondary;
  // Versões opcionais de desktop (≥ 1024px), detectadas no build (lib/local-images.ts).
  const mainDesktop = findLocalImage(`/images/pilotos/paginas/${driver.slug}-principal-desktop`);
  const secondDesktop = findLocalImage(`/images/pilotos/paginas/${driver.slug}-secundaria-desktop`);
  const wide = main.width > main.height; // horizontal: largura total; vertical: layout dividido
  const wideDesktop = mainDesktop ? mainDesktop.width > mainDesktop.height : wide;
  const teamColor = team?.color ?? "#111";
  // Texto pequeno do cabeçalho (caminho, equipe, frase): ≥ 4,5:1 sobre a cor da equipe (branco sólido ou preto).
  const smallText = readableTextOn(teamColor);
  // Sinal da foto principal: a assinatura entra depois que ela começa a aparecer (components/motion/cue.ts).
  const photoCue = `piloto-foto-${driver.slug}`;
  // Texto editorial (fase 4): lib/content/drivers/{slug}.ts.
  const story = getDriverContent(driver.slug);

  // Espaço ao lado do nome: o carro, se o PNG existir no build (fase 2); sem carro, a frase de abertura, 3 números e
  // "Ver a coleção ↓" (refino 2). As miniaturas de produto do topo saíram: os produtos vêm logo depois do topo.
  const carSrc = driver.carImage ?? `/images/pilotos/carros/${driver.slug}.png`;
  const carFile = localImage(carSrc);
  // Rastro de movimento (scripts/carros/padronizar.mjs): {slug}-motion.webp, se existir.
  const ghostSrc = carSrc.replace(/.png$/, "-motion.webp");
  const ghostSoftSrc = carSrc.replace(/.png$/, "-motion-soft.webp");
  const slot = carFile ? (
    <DriverCar
      src={carSrc}
      width={carFile.w}
      height={carFile.h}
      ghost={localImage(ghostSrc) ? ghostSrc : undefined}
      ghostSoft={localImage(ghostSoftSrc) ? ghostSoftSrc : undefined}
      facing={driver.carFacing ?? "right"}
      cue={photoCue}
      delay={CAR_DELAY}
      blur={carFile.blur}
      sizes="(min-width: 768px) 45vw, 90vw"
    />
  ) : story ? (
    <DriverIntro content={story} textColor={smallText} cue={photoCue} delay={INTRO_DELAY} />
  ) : null;
  // Números das curiosidades (texto pequeno sobre branco): cor da equipe só com ≥ 4,5:1.
  const accentOnWhite = contrastRatio(teamColor, "#FFFFFF") >= 4.5 ? teamColor : "#000000";

  // Nome e equipe (bloco na cor da equipe). O nome em texto fica no h1 para leitores de tela e buscadores; a
  // assinatura animada (DriverSignature) usa uma fonte manuscrita GENÉRICA: nunca imitar o autógrafo real (CLAUDE.md).
  const identity = (
    <div className="flex flex-col justify-between gap-10 px-5 py-10 sm:px-10 sm:py-14 lg:px-14">
      <Breadcrumbs
        tone="light"
        color={smallText}
        items={[{ label: "Início", href: "/" }, { label: "Pilotos", href: "/pilotos" }, { label: driver.name }]}
      />
      {/* Desktop/tablet: carro ou miniaturas no espaço vazio entre o caminho e o nome. No celular vêm depois da foto. */}
      <div className="hidden flex-1 items-center md:flex">{slot}</div>
      <div>
        {team && (
          <Link href={`/equipes/${team.slug}`} className="text-[10px] font-semibold uppercase tracking-[0.24em] underline-offset-4 hover:underline" style={{ color: smallText }}>
            {team.name}
          </Link>
        )}
        <h1 className="@container mt-3">
          <span className="sr-only">{driver.name}</span>
          <DriverSignature after={photoCue} signature={signaturePaths(driver.name)} className={wide ? "text-[clamp(2.25rem,8cqw,6rem)]" : "text-[clamp(2.25rem,12.5cqw,6rem)]"} />
        </h1>
        <p className="mt-6 max-w-sm text-sm leading-6 sm:text-base" style={{ color: smallText }}>{driver.phrase}</p>
      </div>
    </div>
  );

  // Foto principal: nítida, sem gradiente nem fade. Encosta nas bordas do bloco: fica reta.
  // Vertical: metade da largura no desktop (altura limitada à tela); no celular vem DEPOIS do nome, com altura
  // controlada (até 62svh / 520px). Horizontal: largura total, proporção da própria foto (até 80svh).
  // Entrada (fase 1 da rodada de conteúdo): cortina na cor da equipe + escala/foco, só com a foto decodificada.
  const mainSizes = wide ? "100vw" : "(min-width: 768px) 50vw, 100vw";
  const vertical = "h-[min(62svh,520px)] md:h-[min(88svh,860px)]";
  const horizontal = "aspect-[3/2] max-h-[80svh] w-full";
  // Desktop com orientação diferente da foto do celular: o layout do topo troca em lg.
  const desktopShape = !mainDesktop || wideDesktop === wide ? "" : wideDesktop ? "lg:h-auto lg:w-full lg:aspect-(--desk-ratio) lg:max-h-[80svh]" : "lg:aspect-auto lg:max-h-none lg:h-[min(88svh,860px)]";
  const photo = (
    <SharedTransition name={driverTransitionName(driver.slug)} crossfade={false}>
      <ImageReveal
        variant="curtain"
        color={teamColor}
        cue={photoCue}
        className={`relative ${wide ? horizontal : vertical} ${desktopShape}`}
        style={mainDesktop ? ({ "--desk-ratio": `${mainDesktop.width}/${mainDesktop.height}` } as React.CSSProperties) : undefined}
      >
        {mainDesktop ? (
          <ArtDirectedImage
            alt={driver.name}
            eager
            quality={90}
            className="object-cover"
            mobile={{ src: main.src, position: main.position, sizes: mainSizes }}
            desktop={{ src: mainDesktop.src, position: main.desktopPosition ?? main.position, sizes: wideDesktop ? "100vw" : "50vw" }}
          />
        ) : (
          <Image
            src={main.src}
            alt={driver.name}
            fill
            preload
            sizes={mainSizes}
            quality={90}
            className="object-cover"
            style={{ objectPosition: main.position }}
            {...blurProps(main.src)}
          />
        )}
      </ImageReveal>
    </SharedTransition>
  );
  const headerLayout = wide ? (wideDesktop ? "" : "lg:grid lg:grid-cols-2") : wideDesktop ? "grid md:grid-cols-2 lg:block" : "grid md:grid-cols-2";

  return (
    <div className="pb-24">
      <header className={`text-white ${headerLayout}`} style={{ backgroundColor: teamColor }}>
        {identity}
        {photo}
        {slot && <div className="px-5 py-8 md:hidden">{slot}</div>}
      </header>

      {/* Ordem (refino 2): topo → produtos → história e números → bloco editorial com a foto secundária. */}
      <section aria-labelledby="produtos-piloto" id="produtos-piloto-secao" className="scroll-mt-24 px-5 pt-16 sm:px-10 sm:pt-20">
        <div className="mx-auto max-w-[1400px]">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Coleção do piloto</p>
          <div className="mb-10 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <SectionTitle id="produtos-piloto" text={`A coleção ${driver.name}`} className="scroll-mt-24 text-3xl font-medium tracking-[-0.06em] sm:text-4xl" />
            <Link href={`/produtos?piloto=${driver.slug}`} className="group inline-flex min-h-11 items-center gap-2 text-sm text-black/60 underline-offset-4 transition hover:text-black hover:underline">
              Ver todos os produtos <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
          <ProductGrid products={products} priorityCount={4} layout="colecao" />
        </div>
      </section>

      {story && (
        <div className="px-5 pt-20 sm:px-10 sm:pt-28">
          <DriverCareer content={story} color={teamColor} name={driver.name} numbersFirst={Boolean(carFile)} />
        </div>
      )}

      {/* Bloco editorial: foto secundária (dentro do container: rounded-2xl) com estilo de pilotagem e curiosidades. A cor
          da equipe aparece como detalhe (fio e marcador), não como cor de texto. */}
      <section aria-label={`Sobre ${driver.name}`} className="px-5 pt-20 sm:px-10 sm:pt-28">
        <div className="mx-auto grid max-w-[1400px] items-start gap-10 md:grid-cols-2 md:gap-16">
          {/* Secundária: mesma cortina, quando a foto entra na tela (e já está decodificada). */}
          <ImageReveal
            variant="curtain"
            start="view"
            color={teamColor}
            className={`relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e8e4] md:sticky md:top-24 ${secondDesktop ? "lg:aspect-(--desk-ratio)" : ""}`}
            style={secondDesktop ? ({ "--desk-ratio": `${secondDesktop.width}/${secondDesktop.height}` } as React.CSSProperties) : undefined}
          >
            {secondDesktop ? (
              <ArtDirectedImage
                alt=""
                quality={90}
                className="object-cover"
                mobile={{ src: second.src, position: second.position, sizes: SECOND_SIZES }}
                desktop={{ src: secondDesktop.src, position: second.desktopPosition ?? second.position, sizes: SECOND_SIZES }}
              />
            ) : (
              <Image
                src={second.src}
                alt=""
                fill
                sizes={SECOND_SIZES}
                quality={90}
                className="object-cover"
                style={{ objectPosition: second.position }}
                {...blurProps(second.src)}
              />
            )}
          </ImageReveal>
          <div>
            <span aria-hidden="true" className="block h-1 w-12 rounded-full" style={{ backgroundColor: teamColor }} />
            {team && (
              <p className="mt-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-black/60">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: teamColor }} />
                {team.name}
              </p>
            )}
            {/* Com carro no topo, a frase de abertura vem para cá (sem carro, ela está no topo). */}
            {story && carFile && <DriverOpening text={story.opening} />}
            {story && (
              <div className="mt-10">
                <DriverExtras content={story} accent={accentOnWhite} name={driver.name} />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
