import Link from "next/link";
import { SectionTitle } from "@/components/motion/section-title";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RotateCcw, Truck } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductGallery } from "@/components/product-gallery";
import { ProductGrid } from "@/components/product-grid";
import { ProductPurchase } from "@/components/product-purchase";
import { catalog } from "@/lib/catalog";
import { discountPercent, formatPrice } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const products = await catalog.getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = await catalog.getProductBySlug((await params).slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/produtos/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.description,
      images: [{ url: product.images[0].src, alt: product.images[0].alt }],
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const product = await catalog.getProductBySlug((await params).slug);
  if (!product) notFound();
  const [category, team, driver, related] = await Promise.all([
    catalog.getCategoryBySlug(product.categorySlug),
    product.teamSlug ? catalog.getTeamBySlug(product.teamSlug) : null,
    product.driverSlug ? catalog.getDriverBySlug(product.driverSlug) : null,
    catalog.getRelatedProducts(product, 12),
  ]);
  // "Complete o look": até 4 relacionados priorizando categorias diferentes da do produto (uma peça de cada tipo).
  const look = [
    ...related.filter((item, index, list) => item.categorySlug !== product.categorySlug && list.findIndex((other) => other.categorySlug === item.categorySlug) === index),
    ...related,
  ]
    .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index)
    .slice(0, 4);
  const discount = discountPercent(product.priceCents, product.compareAtPriceCents);
  const inStock = product.variants.some((variant) => variant.stock > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.variants[0]?.sku,
    image: product.images.map((image) => (image.src.startsWith("http") ? image.src : `${SITE_URL}${image.src}`)),
    brand: { "@type": "Brand", name: team?.name ?? "Apex" },
    category: category?.name,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/produtos/${product.slug}`,
      priceCurrency: "BRL",
      price: (product.priceCents / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="px-5 pb-40 pt-8 sm:px-10 sm:pt-10 md:pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs
          items={[
            { label: "Início", href: "/" },
            { label: "Produtos", href: "/produtos" },
            ...(category ? [{ label: category.name, href: `/categorias/${category.slug}` }] : []),
            { label: product.name },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
          <ProductGallery images={product.images} name={product.name} />

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]">
              {team && (
                <Link href={`/equipes/${team.slug}`} className="text-[#b94f01] hover:underline">
                  {team.name}
                </Link>
              )}
              {driver && (
                <>
                  <span aria-hidden="true" className="text-black/30">·</span>
                  <Link href={`/pilotos/${driver.slug}`} className="text-[#b94f01] hover:underline">
                    {driver.name}
                  </Link>
                </>
              )}
              {!team && !driver && category && <span className="text-[#b94f01]">{category.name}</span>}
            </div>
            <h1 className="mt-3 text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl">{product.name}</h1>

            <p className="mt-5 flex flex-wrap items-baseline gap-3">
              {product.compareAtPriceCents && (
                <span className="text-base text-black/60 line-through">
                  <span className="sr-only">De </span>
                  {formatPrice(product.compareAtPriceCents)}
                </span>
              )}
              <span className="text-2xl font-medium tracking-[-0.03em]">
                {product.compareAtPriceCents && <span className="sr-only">por </span>}
                {formatPrice(product.priceCents)}
              </span>
              {discount > 0 && <span className="rounded-md bg-black px-2 py-1 text-[10px] font-semibold tracking-[0.12em] text-white">-{discount}%</span>}
            </p>
            <p className="mt-1 text-xs text-black/60">ou 3x de {formatPrice(Math.ceil(product.priceCents / 3))} sem juros</p>

            <div className="mt-8">
              <ProductPurchase product={product} />
            </div>

            <div className="mt-10 border-t border-black/10">
              <section aria-labelledby="descricao" className="border-b border-black/10 py-6">
                <h2 id="descricao" className="font-ui text-sm font-medium">Descrição</h2>
                <p className="mt-3 text-sm leading-7 text-black/65">{product.description}</p>
                {product.illustrative && <p className="mt-3 text-xs text-black/60">Produto ilustrativo (catálogo de demonstração).</p>}
              </section>
              <details className="group border-b border-black/10 py-5">
                <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <Truck size={18} strokeWidth={1.5} aria-hidden="true" /> Envio
                  <span aria-hidden="true" className="ml-auto transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-black/65">
                  [CONTEÚDO A SER REDIGIDO] Prazos e valores de envio. Veja a página de <Link href="/envio" className="underline underline-offset-4">envio</Link>.
                </p>
              </details>
              <details className="group border-b border-black/10 py-5">
                <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <RotateCcw size={18} strokeWidth={1.5} aria-hidden="true" /> Trocas e devoluções
                  <span aria-hidden="true" className="ml-auto transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-black/65">
                  [CONTEÚDO A SER REDIGIDO] Política de trocas. Veja a página de{" "}
                  <Link href="/trocas-e-devolucoes" className="underline underline-offset-4">trocas e devoluções</Link>.
                </p>
              </details>
            </div>
          </div>
        </div>

        {look.length > 0 && (
          <section aria-labelledby="complete-o-look" className="mt-24">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Combina com</p>
            <SectionTitle id="complete-o-look" text="Complete o look" className="mb-10 text-3xl font-medium tracking-[-0.06em] sm:text-4xl" />
            <ProductGrid products={look} />
          </section>
        )}
      </div>
    </div>
  );
}
