import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { AddToCartButton } from "@/components/cart";
import { discountPercent, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/catalog/types";

// Card de produto (home, catálogo, equipes, pilotos, categorias). O título é o link do card e se estende sobre
// a imagem (after:inset-0); favorito e compra rápida ficam por cima (z-10).
// Compra rápida: produto de variante única entra direto na sacola; com tamanhos, o botão leva à página do produto.
export const PRODUCT_GRID_SIZES =
  "(min-width: 1480px) 335px, (min-width: 1024px) calc((100vw - 140px) / 4), (min-width: 640px) calc((100vw - 92px) / 2), calc((100vw - 52px) / 2)";
const QUALITY = 85;

const quickClass =
  "absolute bottom-3 left-3 right-3 z-10 translate-y-3 rounded-xl bg-black px-4 py-3 text-center text-xs font-medium text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100";

export function ProductCard({
  product,
  categoryName,
  sizes = PRODUCT_GRID_SIZES,
  priority = false,
}: {
  product: Product;
  categoryName?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const href = `/produtos/${product.slug}`;
  const inStock = product.variants.filter((variant) => variant.stock > 0);
  const single = product.variants.length === 1 ? product.variants[0] : null;
  const discount = discountPercent(product.priceCents, product.compareAtPriceCents);
  return (
    <article className="group relative">
      <div className="relative isolate aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e8e4]">
        <Image
          src={product.images[0].src}
          alt={product.images[0].alt}
          fill
          sizes={sizes}
          quality={QUALITY}
          priority={priority}
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {product.isNew && <span className="rounded-md bg-[#b94f01] px-2 py-1 text-[9px] font-semibold tracking-[0.16em] text-white">NOVO</span>}
          {discount > 0 && <span className="rounded-md bg-black px-2 py-1 text-[9px] font-semibold tracking-[0.16em] text-white">-{discount}%</span>}
        </div>
        <button aria-label={`Adicionar ${product.name} aos favoritos`} className="absolute right-3 top-3 z-10 rounded-xl bg-white/85 p-2 text-black opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100">
          <Heart size={16} strokeWidth={1.5} />
        </button>
        {inStock.length === 0 ? (
          <span className="absolute bottom-3 left-3 z-10 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black">Esgotado</span>
        ) : single ? (
          <AddToCartButton product={product} className={quickClass} />
        ) : (
          <Link href={href} tabIndex={-1} aria-hidden="true" className={quickClass}>
            Escolher tamanho
          </Link>
        )}
      </div>
      {categoryName && <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-black/60">{categoryName}</p>}
      <div className={`${categoryName ? "mt-1" : "mt-4"} flex items-start justify-between gap-3`}>
        <h3 className="min-w-0 text-sm font-medium text-black sm:text-base">
          <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-black">
            {product.name}
          </Link>
        </h3>
        <p className="shrink-0 text-right text-sm text-black/65">
          {product.compareAtPriceCents && (
            <span className="block whitespace-nowrap text-xs text-black/60 line-through">
              <span className="sr-only">De </span>
              {formatPrice(product.compareAtPriceCents)}
            </span>
          )}
          {product.compareAtPriceCents && <span className="sr-only">por </span>}
          <span className="whitespace-nowrap">{formatPrice(product.priceCents)}</span>
        </p>
      </div>
    </article>
  );
}
