import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductGrid } from "@/components/product-grid";
import { catalog } from "@/lib/catalog";

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
  const [first, ...rest] = driver.name.split(" ");

  return (
    <div className="pb-24">
      {/* Cabeçalho na cor da equipe com a foto do piloto. A foto encosta nas bordas do bloco: fica reta. */}
      <header className="grid text-white md:grid-cols-2" style={{ backgroundColor: team?.color ?? "#111" }}>
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
            <h1 className="mt-3 leading-[0.9]">
              <span className="font-playfair block text-4xl italic tracking-[-0.04em] sm:text-5xl">{first}</span>
              <span className="block text-6xl font-medium tracking-[-0.07em] sm:text-8xl">{rest.join(" ")}</span>
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-6 text-white/85 sm:text-base">{driver.phrase}</p>
          </div>
        </div>
        <div className="relative min-h-[420px] md:min-h-[560px]">
          <Image
            src={driver.image}
            alt={driver.name}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            quality={90}
            className="object-cover"
            style={{ objectPosition: driver.imagePosition }}
          />
        </div>
      </header>

      <section aria-labelledby="produtos-piloto" className="px-5 pt-16 sm:px-10">
        <div className="mx-auto max-w-[1400px]">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Coleção do piloto</p>
          <div className="mb-10 flex items-end justify-between gap-6">
            <h2 id="produtos-piloto" className="text-3xl font-medium tracking-[-0.06em] sm:text-4xl">
              Produtos {driver.name}
            </h2>
            <Link href={`/produtos?piloto=${driver.slug}`} className="text-sm text-black/60 transition hover:text-black">
              Filtrar no catálogo
            </Link>
          </div>
          <ProductGrid products={products} priorityCount={4} />
        </div>
      </section>
    </div>
  );
}
