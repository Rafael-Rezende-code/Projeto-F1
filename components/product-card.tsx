import Link from "next/link";
import Image from "next/image";
import { ImageReveal } from "@/components/motion/image-reveal";
import { AddToCartButton } from "@/components/cart";
import { FavoriteButton } from "@/components/favorites";
import { QuickSizes } from "@/components/quick-sizes";
import { productTransitionName, SharedTransition } from "@/components/motion/view-transition";
import { discountPercent, formatPrice } from "@/lib/format";
import { storePolicy } from "@/lib/store-policy";
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
  transition = false,
}: {
  product: Product;
  categoryName?: string;
  sizes?: string;
  priority?: boolean;
  /** Liga a View Transition da imagem para a página do produto (só onde o produto aparece uma vez na tela). */
  transition?: boolean;
}) {
  const href = `/produtos/${product.slug}`;
  const inStock = product.variants.filter((variant) => variant.stock > 0);
  const single = product.variants.length === 1 ? product.variants[0] : null;
  const discount = discountPercent(product.priceCents, product.compareAtPriceCents);
  return (
    <article data-fly-scope className="group relative">
      <SharedTransition name={transition ? productTransitionName(product.slug) : undefined}>
      <div data-fly-image className="relative isolate aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e8e4]">
        {/* Entrada sutil (fade) quando a foto ainda não carregou. Sem placeholder desfocado: as fotos de produto são
            remotas, e este card também roda no cliente (favoritos), onde o mapa de placeholders pesaria no JS. */}
        <ImageReveal className="absolute inset-0">
          <Image
            src={product.images[0].src}
            alt={product.images[0].alt}
            fill
            sizes={sizes}
            quality={QUALITY}
            priority={priority}
            className="object-cover transition duration-700 group-hover:scale-105"
          />
        </ImageReveal>
        {/* Segunda foto no hover (desktop): troca suave por cima da primeira. */}
        {product.images[1] && (
          <Image
            src={product.images[1].src}
            alt=""
            fill
            sizes={sizes}
            quality={QUALITY}
            className="object-cover opacity-0 transition duration-700 group-hover:scale-105 [@media(hover:hover)]:group-hover:opacity-100"
          />
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {product.isNew && <span className="rounded-md bg-[#b94f01] px-2 py-1 text-[9px] font-semibold tracking-[0.16em] text-white">NOVO</span>}
          {discount > 0 && <span className="rounded-md bg-black px-2 py-1 text-[9px] font-semibold tracking-[0.16em] text-white">-{discount}%</span>}
        </div>
        {/* Favoritar: sempre visível no toque; no desktop aparece no hover/foco (ou quando já é favorito). */}
        <FavoriteButton
          slug={product.slug}
          name={product.name}
          className="absolute right-3 top-3 z-10 rounded-xl bg-white/85 p-2 text-black transition focus-visible:opacity-100 aria-pressed:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
        />
        {inStock.length === 0 ? (
          <span className="absolute bottom-3 left-3 z-10 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black">Esgotado</span>
        ) : single ? (
          <AddToCartButton product={product} className={quickClass} />
        ) : (
          // Chips de tamanho (compra rápida) só onde há hover; no toque, o card leva à página do produto.
          <QuickSizes
            product={product}
            className="absolute bottom-3 left-3 right-3 z-10 hidden translate-y-3 gap-1.5 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 [@media(hover:hover)]:flex"
          />
        )}
      </div>
      </SharedTransition>
      {categoryName && <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-black/60">{categoryName}</p>}
      <div className={`${categoryName ? "mt-1" : "mt-4"} flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3`}>
        <h3 className="min-w-0 text-sm font-medium text-black sm:text-base">
          <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-black">
            {product.name}
          </Link>
        </h3>
        <p className="shrink-0 text-sm text-black/65 sm:text-right">
          {product.compareAtPriceCents && (
            <span className="mr-2 whitespace-nowrap text-xs text-black/60 line-through sm:mr-0 sm:block">
              <span className="sr-only">De </span>
              {formatPrice(product.compareAtPriceCents)}
            </span>
          )}
          {product.compareAtPriceCents && <span className="sr-only">por </span>}
          <span className="whitespace-nowrap">{formatPrice(product.priceCents)}</span>
          {storePolicy.pixDiscountPercent > 0 && <span className="ml-2 whitespace-nowrap text-[11px] text-black/60 sm:ml-0 sm:block">{storePolicy.pixDiscountPercent}% off no Pix</span>}
        </p>
      </div>
    </article>
  );
}
