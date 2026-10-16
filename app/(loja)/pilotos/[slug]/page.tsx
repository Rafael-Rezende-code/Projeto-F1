import Link from "next/link";
import { SectionTitle } from "@/components/motion/section-title";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DriverSignature } from "@/components/driver-signature";
import { driverTransitionName, SharedTransition } from "@/components/motion/view-transition";
import { ProductGrid } from "@/components/product-grid";
import { catalog } from "@/lib/catalog";
import { signaturePaths } from "@/lib/signature-paths";

type Params = { params: Promise<{ slug: string }> };

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
  const wide = main.width > main.height; // horizontal: largura total; vertical: layout dividido
  const teamColor = team?.color ?? "#111";

  // Nome e equipe (bloco na cor da equipe). O nome em texto fica no h1 para leitores de tela e buscadores; a
  // assinatura animada (DriverSignature) usa uma fonte manuscrita GENÉRICA: nunca imitar o autógrafo real (CLAUDE.md).
  const identity = (
    <div className="flex flex-col justify-between gap-10 px-5 py-10 sm:px-10 sm:py-14 lg:px-14">
      <Breadcrumbs
        tone="light"
        items={[{ label: "Início", href: "/" }, { label: "Pilotos", href: "/pilotos" }, { label: driver.name }]}
      />
      <div>
        {team && (
          <Link href={`/equipes/${team.slug}`} className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/80 hover:text-white">
            {team.name}
          </Link>
        )}
        <h1 className="@container mt-3">
          <span className="sr-only">{driver.name}</span>
          <DriverSignature signature={signaturePaths(driver.name)} className={wide ? "text-[clamp(2.25rem,8cqw,6rem)]" : "text-[clamp(2.25rem,12.5cqw,6rem)]"} />
        </h1>
        <p className="mt-6 max-w-sm text-sm leading-6 text-white/85 sm:text-base">{driver.phrase}</p>
      </div>
    </div>
  );

  // Foto principal: nítida, sem gradiente nem fade. Encosta nas bordas do bloco: fica reta.
  // Vertical: metade da largura no desktop (altura limitada à tela); no celular vem DEPOIS do nome, com altura
  // controlada (até 62svh / 520px). Horizontal: largura total, proporção da própria foto (até 80svh).
  const photo = (
    <SharedTransition name={driverTransitionName(driver.slug)} crossfade={false}>
      <div className={wide ? "relative aspect-[3/2] max-h-[80svh] w-full" : "relative h-[min(62svh,520px)] md:h-[min(88svh,860px)]"}>
        <Image
          src={main.src}
          alt={driver.name}
          fill
          priority
          sizes={wide ? "100vw" : "(min-width: 768px) 50vw, 100vw"}
          quality={90}
          className="object-cover"
          style={{ objectPosition: main.position }}
        />
      </div>
    </SharedTransition>
  );

  return (
    <div className="pb-24">
      <header className={`text-white ${wide ? "" : "grid md:grid-cols-2"}`} style={{ backgroundColor: teamColor }}>
        {identity}
        {photo}
      </header>

      {/* Bloco editorial: foto secundária (dentro do container: rounded-2xl) e texto. A cor da equipe aparece como
          detalhe (fio e marcador), não como cor de texto: algumas cores não têm contraste suficiente sobre o branco. */}
      <section aria-label={`Sobre ${driver.name}`} className="px-5 pt-16 sm:px-10 sm:pt-24">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e8e4]">
            <Image
              src={second.src}
              alt=""
              fill
              sizes="(min-width: 1480px) 680px, (min-width: 768px) calc(50vw - 72px), calc(100vw - 40px)"
              quality={90}
              className="object-cover"
              style={{ objectPosition: second.position }}
            />
          </div>
          <div className="max-w-md">
            <span aria-hidden="true" className="block h-1 w-12 rounded-full" style={{ backgroundColor: teamColor }} />
            {team && (
              <p className="mt-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-black/60">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: teamColor }} />
                {team.name}
              </p>
            )}
            <p className="mt-4 text-lg leading-8 text-black/80">[TEXTO SOBRE O PILOTO]</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="produtos-piloto" className="px-5 pt-16 sm:px-10">
        <div className="mx-auto max-w-[1400px]">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Coleção do piloto</p>
          <div className="mb-10 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <SectionTitle id="produtos-piloto" text={`Produtos ${driver.name}`} className="text-3xl font-medium tracking-[-0.06em] sm:text-4xl" />
            <Link href={`/produtos?piloto=${driver.slug}`} className="group inline-flex min-h-11 items-center gap-2 text-sm text-black/60 underline-offset-4 transition hover:text-black hover:underline">
              Filtrar no catálogo <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
          <ProductGrid products={products} priorityCount={4} />
        </div>
      </section>
    </div>
  );
}
