import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ImageReveal } from "@/components/motion/image-reveal";
import { SectionTitle } from "@/components/motion/section-title";
import { ProductGrid } from "@/components/product-grid";
import { BRAND } from "@/lib/brand";
import { catalog } from "@/lib/catalog";
import { articles, getArticle, readingMinutes, type ArticleImage } from "@/lib/content/diario";
import { formatLongDate } from "@/lib/format-date";
import { blurProps } from "@/lib/local-images";
import { SITE_URL } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) return { title: "Artigo não encontrado" };
  return {
    title: article.title,
    description: article.dek,
    alternates: { canonical: `/diario/${article.slug}` },
    openGraph: { type: "article", title: article.title, description: article.dek, publishedTime: article.date, images: [{ url: article.cover.src, alt: article.cover.alt }] },
  };
}

function Figure({ image, priority = false, sizes }: { image: ArticleImage; priority?: boolean; sizes: string }) {
  return (
    <figure>
      <ImageReveal className="relative isolate aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e8e4] sm:aspect-[16/10]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          preload={priority}
          sizes={sizes}
          quality={85}
          className="object-cover"
          style={{ objectPosition: image.position }}
          {...blurProps(image.src)}
        />
      </ImageReveal>
      {image.caption && <figcaption className="mt-3 text-sm leading-6 text-black/60">{image.caption}</figcaption>}
    </figure>
  );
}

// Artigo do Diário (fase 6): capa, título grande, data e tempo de leitura, texto em coluna de leitura (~65 caracteres
// por linha: max-w-[65ch] com 18px), imagens no corpo um pouco mais largas que o texto e produtos relacionados no fim.
export default async function ArticlePage({ params }: Params) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const { related } = article;
  const products = related.slugs
    ? await catalog.getProductsBySlugs(related.slugs)
    : (await catalog.getProducts({ driver: related.driver, team: related.team })).slice(0, 4);
  const minutes = readingMinutes(article);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.dek,
    datePublished: article.date,
    image: `${SITE_URL}${article.cover.src}`,
    author: { "@type": "Organization", name: BRAND.name },
    publisher: { "@type": "Organization", name: BRAND.name },
    mainEntityOfPage: `${SITE_URL}/diario/${article.slug}`,
  };

  return (
    <article className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Diário", href: "/diario" }, { label: article.title }]} />
        <header className="mx-auto mt-10 max-w-[900px] text-center sm:mt-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Diário</p>
          <h1 className="mt-4 text-4xl leading-[1.02] tracking-[-0.05em] text-black sm:text-6xl lg:text-7xl">{article.title}</h1>
          <p className="mx-auto mt-6 max-w-[60ch] text-lg leading-8 text-black/70">{article.dek}</p>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-black/60">
            <time dateTime={article.date}>{formatLongDate(article.date)}</time> · {minutes} min de leitura
          </p>
        </header>
        <div className="mx-auto mt-10 max-w-[1100px] sm:mt-14">
          <Figure image={article.cover} priority sizes="(min-width: 1180px) 1100px, calc(100vw - 40px)" />
        </div>

        <div className="mx-auto mt-12 max-w-[65ch] text-[17px] leading-8 text-black/85 sm:mt-16 sm:text-lg sm:leading-[1.8]">
          {article.body.map((block, index) =>
            block.type === "p" ? (
              <p key={index} className="mt-6 first:mt-0">{block.text}</p>
            ) : block.type === "h2" ? (
              <h2 key={index} className="mt-14 text-2xl leading-tight tracking-[-0.04em] text-black sm:text-3xl">{block.text}</h2>
            ) : (
              // Imagem do corpo: sangra um pouco além da coluna de texto no desktop.
              <div key={index} className="my-12 lg:-mx-24">
                <Figure image={block.image} sizes="(min-width: 1024px) 840px, calc(100vw - 40px)" />
              </div>
            ),
          )}
          <p className="mt-14 border-t border-black/10 pt-6 text-xs leading-5 text-black/60">
            Texto editorial independente, escrito por fãs. A {BRAND.name} não tem vínculo com os pilotos, equipes ou marcas citados.
          </p>
        </div>

        {products.length > 0 && (
          <section aria-labelledby="relacionados" className="mt-20 sm:mt-28">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Para vestir a história</p>
            <div className="mb-10 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
              <SectionTitle id="relacionados" text="Produtos relacionados" className="text-3xl font-medium tracking-[-0.06em] sm:text-4xl" />
              <Link href="/diario" className="group inline-flex min-h-11 items-center gap-2 text-sm text-black/60 underline-offset-4 transition hover:text-black hover:underline">
                Mais do Diário <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
            <ProductGrid products={products} />
          </section>
        )}
      </div>
    </article>
  );
}
