import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductGrid } from "@/components/product-grid";
import type { Product } from "@/lib/catalog/types";
import type { CampeaoChapter } from "@/lib/campeao";

type Chapter = Extract<CampeaoChapter, { kind: "colecao" }>;

// Capítulo "A coleção" (#colecao): produtos com a tag `antonelli`. Sem produto: "Em breve" bonito, com a lista (newsletter).
export function CampeaoColecao({ chapter, products }: { chapter: Chapter; products: Product[] }) {
  return (
    <section id={chapter.id} aria-labelledby={`${chapter.id}-titulo`} className="scroll-mt-24 bg-[#e4dfdc] px-5 py-20 text-black sm:px-10 sm:py-28">
      <div className="mx-auto max-w-[1400px]">
        <p className="font-campeao-mono text-[11px] uppercase tracking-[0.28em] text-black/70">{chapter.label}</p>
        {products.length > 0 ? (
          <>
            <div className="mb-12 mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id={`${chapter.id}-titulo`} className="text-4xl font-medium tracking-[-0.06em] sm:text-5xl">{chapter.title}</h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-black/70">{chapter.body}</p>
              </div>
              <Link href="/produtos?q=antonelli" className="group inline-flex min-h-11 items-center gap-2 text-sm text-black/70 underline-offset-4 transition hover:text-black hover:underline">
                Ver no catálogo <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <ProductGrid products={products} />
          </>
        ) : (
          <div className="mx-auto mt-6 max-w-2xl text-center">
            <h2 id={`${chapter.id}-titulo`} className="text-5xl font-medium tracking-[-0.06em] sm:text-7xl">{chapter.emptyTitle}</h2>
            <span aria-hidden="true" className="mx-auto mt-8 block h-px w-24 bg-gradient-to-r from-transparent via-[#b88a2c] to-transparent" />
            <p className="mx-auto mt-8 max-w-md text-base leading-7 text-black/70">{chapter.emptyBody}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/#newsletter" className="inline-flex min-h-11 items-center rounded-xl bg-[#0d0d0d] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#b88a2c] hover:text-black">
                Quero saber primeiro
              </Link>
              <Link href="/equipes/mercedes" className="inline-flex min-h-11 items-center rounded-xl border border-black/20 px-6 py-3 text-sm font-medium text-black transition-colors hover:border-black">
                Ver a coleção Mercedes
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
