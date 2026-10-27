import Image from "next/image";
import Link from "next/link";
import { ImageReveal } from "@/components/motion/image-reveal";
import { readingMinutes, type Article } from "@/lib/content/diario";
import { formatLongDate } from "@/lib/format-date";
import { blurProps } from "@/lib/local-images";

// Card de artigo do Diário (índice /diario). `featured`: o mais recente, grande, com a capa em 16:9 no desktop.
// Hover (mapa em lib/motion.ts, `hover.article`): um véu escuro sobre a foto se abre (.hover-veil, opacidade) e o título
// ganha um sublinhado que cresce da esquerda (.hover-underline, transform). Sem zoom: o zoom é o hover das coleções.
export function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  return (
    <article className={`group ${featured ? "grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end lg:gap-12" : ""}`}>
      <Link href={`/diario/${article.slug}`} tabIndex={-1} aria-hidden="true" className="block">
        <ImageReveal className={`relative isolate overflow-hidden rounded-2xl bg-[#e9e8e4] ${featured ? "aspect-[4/5] sm:aspect-[16/10]" : "aspect-[4/3]"}`}>
          <Image
            src={article.cover.src}
            alt=""
            fill
            sizes={featured ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 768px) 45vw, 100vw"}
            quality={85}
            className="object-cover"
            style={{ objectPosition: article.cover.position }}
            {...blurProps(article.cover.src)}
          />
          <span aria-hidden="true" className="hover-veil absolute inset-0 bg-black/20" />
        </ImageReveal>
      </Link>
      <div className={featured ? "" : "mt-5"}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/60">
          <time dateTime={article.date}>{formatLongDate(article.date)}</time> · {readingMinutes(article)} min de leitura
        </p>
        <h2 className={`mt-3 tracking-[-0.04em] text-black ${featured ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>
          <Link href={`/diario/${article.slug}`} className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
            <span className="hover-underline">{article.title}</span>
          </Link>
        </h2>
        <p className="mt-4 max-w-[60ch] text-base leading-7 text-black/70">{article.dek}</p>
        <span aria-hidden="true" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-black">
          Ler artigo <span>→</span>
        </span>
      </div>
    </article>
  );
}
