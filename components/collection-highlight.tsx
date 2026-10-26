import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ImageReveal } from "@/components/motion/image-reveal";
import { productTransitionName, SharedTransition } from "@/components/motion/view-transition";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/catalog/types";

// Destaque da landing de coleção (refino 3, item 1.4): o primeiro produto em tamanho grande, com a frase de abertura da
// descrição e um único link para a página do produto. A foto recebe a View Transition (o produto não se repete na grade).
const SIZES = "(min-width: 1480px) 700px, (min-width: 1024px) calc((100vw - 120px) * 0.55), calc(100vw - 40px)";

export function CollectionHighlight({ product, categoryName }: { product: Product; categoryName?: string }) {
  const lead = product.description.split("\n\n")[0];
  return (
    <article className="group relative grid items-center gap-6 rounded-2xl bg-[#f5f5f3] p-4 text-black sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
      <SharedTransition name={productTransitionName(product.slug)}>
        <ImageReveal className="relative isolate aspect-[4/3] overflow-hidden rounded-2xl bg-[#e9e8e4]">
          <Image src={product.images[0].src} alt={product.images[0].alt} fill sizes={SIZES} quality={85} className="object-cover transition duration-700 group-hover:scale-[1.04]" />
        </ImageReveal>
      </SharedTransition>
      <div className="pb-2 lg:pb-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Destaque{categoryName ? ` · ${categoryName}` : ""}</p>
        <h2 className="mt-3 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">
          <Link href={`/produtos/${product.slug}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-black">
            {product.name}
          </Link>
        </h2>
        <p className="mt-4 max-w-md text-sm leading-7 text-black/65">{lead}</p>
        <p className="mt-5 text-lg">
          {product.compareAtPriceCents && (
            <span className="mr-2 text-sm text-black/60 line-through">
              <span className="sr-only">De </span>
              {formatPrice(product.compareAtPriceCents)}
            </span>
          )}
          {product.compareAtPriceCents && <span className="sr-only">por </span>}
          {formatPrice(product.priceCents)}
        </p>
        <span aria-hidden="true" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-xs font-medium text-white transition group-hover:bg-[#b94f01]">
          Ver produto <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </article>
  );
}
