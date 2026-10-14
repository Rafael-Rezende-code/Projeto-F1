import Link from "next/link";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductGrid } from "@/components/product-grid";
import { TeamRow } from "@/components/team-row";
import { catalog } from "@/lib/catalog";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const teams = await catalog.getTeams();
  return teams.map((team) => ({ slug: team.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const team = await catalog.getTeamBySlug((await params).slug);
  if (!team) return { title: "Equipe não encontrada" };
  const description = `Produtos da ${team.name}: roupas, bonés, jaquetas e colecionáveis. ${team.tagline}`;
  return { title: team.name, description, alternates: { canonical: `/equipes/${team.slug}` }, openGraph: { title: team.name, description } };
}

export default async function TeamPage({ params }: Params) {
  const team = await catalog.getTeamBySlug((await params).slug);
  if (!team) notFound();
  const [products, teams] = await Promise.all([catalog.getProducts({ team: team.slug }), catalog.getTeams()]);
  const h = team.logo.displayHeight;

  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Equipes", href: "/#teams" }, { label: team.name }]} />

        {/* Cabeçalho na linguagem da "lista editorial": linha larga com nome grande e logo à direita. A cor da equipe
            entra da esquerda ao abrir a página (.apex-wipe-in), com texto e logo brancos. */}
        <header className="apex-wipe-in relative mt-8 overflow-hidden rounded-2xl text-white" style={{ backgroundColor: team.color }}>
          <div className="flex flex-col gap-8 px-6 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:py-14">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/80">Equipe</p>
              <h1 className="mt-3 text-5xl font-medium leading-[0.95] tracking-[-0.07em] sm:text-7xl lg:text-8xl">{team.name}</h1>
              <p className="mt-5 max-w-md text-sm leading-6 text-white/85 sm:text-base">{team.tagline}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- logo monocromática */}
            <img
              src={team.logo.src}
              alt={`Logo ${team.name}`}
              width={team.logo.width}
              height={team.logo.height}
              className="w-auto shrink-0 self-start [filter:brightness(0)_invert(1)] [height:calc(var(--h)*1.1)] sm:self-end sm:[height:calc(var(--h)*1.6)]"
              style={{ "--h": `${h}px` } as CSSProperties}
            />
          </div>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25" />
        </header>

        <section aria-labelledby="produtos-equipe" className="mt-16">
          <div className="mb-10 flex items-end justify-between gap-6">
            <h2 id="produtos-equipe" className="text-3xl font-medium tracking-[-0.06em] sm:text-4xl">
              Produtos {team.name}
            </h2>
            <Link href={`/produtos?equipe=${team.slug}`} className="text-sm text-black/60 transition hover:text-black">
              Filtrar no catálogo
            </Link>
          </div>
          <ProductGrid products={products} priorityCount={4} />
        </section>

        <nav aria-labelledby="outras-equipes" className="mt-24">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Escolha sua equipe</p>
          <h2 id="outras-equipes" className="mb-6 text-3xl font-medium tracking-[-0.06em] sm:text-4xl">
            Outras equipes
          </h2>
          <ul role="list" className="grid gap-x-8 md:grid-cols-2">
            {teams.map((other) => (
              <li key={other.slug}>
                <TeamRow team={other} current={other.slug === team.slug} />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
