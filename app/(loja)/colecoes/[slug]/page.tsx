import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CollectionHighlight } from "@/components/collection-highlight";
import { EditorialHeader } from "@/components/editorial-header";
import { SectionTitle } from "@/components/motion/section-title";
import { ProductGrid } from "@/components/product-grid";
import { catalog } from "@/lib/catalog";
import { collectionsWithProducts, productsInCollection, splitCollectionHighlight } from "@/lib/catalog/collections";
import { collections, getCollection } from "@/lib/content/collections";
import { BRAND } from "@/lib/brand";

type Params = { params: Promise<{ slug: string }> };

// Landing editorial de coleção (refino 3, item 1.4): capa e texto curto, destaque do primeiro produto, a grade com os
// filtros da coleção e o link para o catálogo. Sem produtos publicados: "Em breve" com link para a newsletter.
export async function generateStaticParams() {
  return collections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const collection = getCollection((await params).slug);
  if (!collection) return { title: "Coleção não encontrada" };
  const description = `${collection.title}: ${collection.phrase} ${collection.intro}`.slice(0, 160);
  const empty = productsInCollection(collection, await catalog.getProducts()).length === 0;
  return {
    title: collection.title,
    // "Em breve" fica fora dos buscadores (e do sitemap) até ter produto.
    ...(empty ? { robots: { index: false, follow: true } } : {}),
    description,
    alternates: { canonical: `/colecoes/${collection.slug}` },
    openGraph: { title: `${collection.title} | ${BRAND.name}`, description, images: [{ url: collection.cover.src, alt: collection.cover.alt }] },
  };
}

export default async function CollectionPage({ params }: Params) {
  const collection = getCollection((await params).slug);
  if (!collection) notFound();
  const [all, categories] = await Promise.all([catalog.getProducts(), catalog.getCategories()]);
  const products = productsInCollection(collection, all);
  const { highlight, rest } = splitCollectionHighlight(products);
  const others = collectionsWithProducts(all).filter((item) => item.collection.slug !== collection.slug);
  const nameOf = (slug: string) => categories.find((category) => category.slug === slug)?.name;

  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Coleções", href: "/colecoes" }, { label: collection.title }]} />
        <div className="mt-8">
          <EditorialHeader eyebrow="Coleção" title={collection.title} phrase={collection.phrase} intro={collection.intro} image={collection.cover}>
            {products.length > 0 && (
              <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-black/60">
                <span>{products.length === 1 ? "1 produto" : `${products.length} produtos`}</span>
                <Link href={`/produtos?colecao=${collection.slug}`} className="group inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:text-black hover:underline">
                  Filtrar no catálogo <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
                </Link>
              </p>
            )}
          </EditorialHeader>
        </div>

        {highlight ? (
          <>
            <div className="mt-14">
              <CollectionHighlight product={highlight} categoryName={nameOf(highlight.categorySlug)} />
            </div>
            {rest.length > 0 && (
              <section aria-labelledby="colecao-grade" className="mt-20">
                <SectionTitle id="colecao-grade" text={`Toda a coleção ${collection.title.toLowerCase()}`} className="mb-10 text-3xl font-medium tracking-[-0.06em] sm:text-4xl" />
                <ProductGrid products={rest} />
              </section>
            )}
          </>
        ) : (
          <section aria-labelledby="em-breve" className="mx-auto mt-16 max-w-lg rounded-2xl bg-[#f5f5f3] px-6 py-14 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Em breve</p>
            <h2 id="em-breve" className="mt-3 text-2xl text-black font-medium tracking-[-0.05em]">Esta coleção ainda está nos boxes.</h2>
            <p className="mt-3 text-sm leading-6 text-black/60">As primeiras peças chegam em breve. Entre na lista e saiba quando a coleção abrir.</p>
            <Link href="/#newsletter" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-black px-6 py-3 text-xs font-medium text-white transition hover:bg-[#b94f01]">
              Quero saber primeiro
            </Link>
          </section>
        )}

        {others.length > 0 && (
          <nav aria-label="Outras coleções" className="mt-24 border-t border-black/10 pt-10">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-black/60">Outras coleções</p>
            <ul className="flex flex-wrap gap-2">
              {others.map(({ collection: other }) => (
                <li key={other.slug}>
                  <Link href={`/colecoes/${other.slug}`} className="inline-flex min-h-11 items-center rounded-xl border border-black/15 px-4 text-sm text-black transition hover:border-black">
                    {other.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
