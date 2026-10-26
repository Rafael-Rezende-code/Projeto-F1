import { BRAND } from "@/lib/brand";
import Link from "next/link";
import { SectionTitle } from "@/components/motion/section-title";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { productTransitionName } from "@/components/motion/view-transition";
import { ProductGallery } from "@/components/product-gallery";
import { ProductGrid } from "@/components/product-grid";
import { ProductPurchase } from "@/components/product-purchase";
import { RecentlyViewed } from "@/components/recently-viewed";
import { completeTheLook } from "@/lib/catalog/look";
import { WhatsAppTopic } from "@/components/whatsapp";
import { TrackEvent } from "@/components/track-event";
import { ShippingEstimator } from "@/components/shipping-estimator";
import { catalog } from "@/lib/catalog";
import { dispatchNotice, ORIGIN_LABELS } from "@/lib/catalog/fulfillment";
import { discountPercent, formatPrice } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { installmentOffer, storePolicy } from "@/lib/store-policy";

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
    description: product.description.split("\n\n")[0],
    alternates: { canonical: `/produtos/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.description.split("\n\n")[0],
      images: [{ url: product.images[0].src, alt: product.images[0].alt }],
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const product = await catalog.getProductBySlug((await params).slug);
  if (!product) notFound();
  const [category, team, driver, all] = await Promise.all([
    catalog.getCategoryBySlug(product.categorySlug),
    product.teamSlug ? catalog.getTeamBySlug(product.teamSlug) : null,
    product.driverSlug ? catalog.getDriverBySlug(product.driverSlug) : null,
    catalog.getProducts(),
  ]);
  // "Complete o look" (lib/catalog/look.ts): 3 a 4 peças de OUTRAS categorias, preferindo o mesmo piloto e a mesma equipe.
  const look = completeTheLook(product, all);
  const discount = discountPercent(product.priceCents, product.compareAtPriceCents);
  // Parcelamento anunciado: só se a loja configurou parcelas SEM JUROS (lib/store-policy.ts); senão, nada aparece.
  const offer = installmentOffer(product.priceCents);
  const notice = dispatchNotice(product);
  const shippingSku = (product.variants.find((variant) => variant.stock > 0) ?? product.variants[0])?.sku;
  const inStock = product.variants.some((variant) => variant.stock > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description.replace(/\n\n/g, " "),
    sku: product.variants[0]?.sku,
    image: product.images.map((image) => (image.src.startsWith("http") ? image.src : `${SITE_URL}${image.src}`)),
    brand: { "@type": "Brand", name: team?.name ?? BRAND.name },
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
          <ProductGallery images={product.images} name={product.name} transitionName={productTransitionName(product.slug)} />

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
                <span className="text-base text-black/60 line-through xl:text-lg">
                  <span className="sr-only">De </span>
                  {formatPrice(product.compareAtPriceCents)}
                </span>
              )}
              <span className="text-2xl font-medium tracking-[-0.03em] xl:text-4xl">
                {product.compareAtPriceCents && <span className="sr-only">por </span>}
                {formatPrice(product.priceCents)}
              </span>
              {discount > 0 && <span className="rounded-md bg-black px-2 py-1 text-[10px] font-semibold tracking-[0.12em] text-white">-{discount}%</span>}
            </p>
            {offer && <p className="mt-1 text-xs text-black/60 xl:mt-2 xl:text-sm">ou {offer.count}x de {formatPrice(offer.amountCents)} sem juros</p>}

            {/* Modelo de venda (refino 2, item 5): sob encomenda e/ou prazo de envio acima do padrão. */}
            {notice && (
              <div className="mt-6 flex gap-3 rounded-xl border border-black/10 bg-[#f5f5f3] px-4 py-3 text-sm leading-6">
                <Clock size={18} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" />
                <p>
                  {notice.madeToOrder && <strong className="block font-medium text-black">Produto sob encomenda{notice.imported ? ` · ${ORIGIN_LABELS.importado}` : ""}</strong>}
                  <span className="text-black/70">{notice.text}.</span>
                  {notice.madeToOrder && <span className="text-black/70"> A peça é pedida ao fornecedor depois da confirmação do pagamento.</span>}
                </p>
              </div>
            )}

            <div className="mt-8">
              <ProductPurchase product={product} />
              <WhatsAppTopic product={{ name: product.name, slug: product.slug }} />
              <TrackEvent event={{ name: "view_item", item: { id: product.slug, name: product.name, priceCents: product.priceCents, category: product.categorySlug } }} />
              {/* Frete por CEP: o pacote é o mesmo para todos os tamanhos; cota com uma variante disponível. */}
              {shippingSku && <ShippingEstimator items={[{ sku: shippingSku, quantity: 1 }]} className="mt-6" />}
            </div>

            <div className="mt-10 border-t border-black/10">
              <section aria-labelledby="descricao" className="border-b border-black/10 py-6">
                <h2 id="descricao" className="font-ui text-sm font-medium">Descrição</h2>
                {product.description.split("\n\n").map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className="mt-3 text-sm leading-7 text-black/65">{paragraph}</p>
                ))}
                {product.details && product.details.length > 0 && (
                  <div className="mt-5">
                    {product.detailsPending && (
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b94f01]">[CONFERIR COM O PRODUTO REAL]</p>
                    )}
                    <dl className="divide-y divide-black/10 border-y border-black/10 text-sm">
                      {product.details.map((detail) => (
                        <div key={detail.label} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 py-2.5">
                          <dt className="font-medium text-black">{detail.label}</dt>
                          <dd className="leading-6 text-black/65">{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                {product.illustrative && <p className="mt-3 text-xs text-black/60">Produto ilustrativo (catálogo de demonstração).</p>}
              </section>
              {/* Envio, trocas e garantia são promessas: só aparecem se a loja as configurou (lib/store-policy.ts). */}
              {storePolicy.shippingNote && (
                <details className="group border-b border-black/10 py-5">
                  <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <Truck size={18} strokeWidth={1.5} aria-hidden="true" /> Envio
                    <span aria-hidden="true" className="ml-auto transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-black/65">
                    {storePolicy.shippingNote} Veja a página de <Link href="/envio" className="underline underline-offset-4">envio</Link>.
                  </p>
                </details>
              )}
              {storePolicy.returnsNote && (
                <details className="group border-b border-black/10 py-5">
                  <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <RotateCcw size={18} strokeWidth={1.5} aria-hidden="true" /> Trocas e devoluções
                    <span aria-hidden="true" className="ml-auto transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-black/65">
                    {storePolicy.returnsNote} Veja a página de <Link href="/trocas-e-devolucoes" className="underline underline-offset-4">trocas e devoluções</Link>.
                  </p>
                </details>
              )}
              {storePolicy.warrantyNote && (
                <details className="group border-b border-black/10 py-5">
                  <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <ShieldCheck size={18} strokeWidth={1.5} aria-hidden="true" /> Garantia
                    <span aria-hidden="true" className="ml-auto transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-black/65">{storePolicy.warrantyNote}</p>
                </details>
              )}
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
        <RecentlyViewed slug={product.slug} />
      </div>
    </div>
  );
}
