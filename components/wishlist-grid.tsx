"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/catalog/types";

type Entry = { key: string; product: Product | null; categoryName?: string };

// Grade da lista de desejos pública (loja extra, item 4): "Ver produto" e "Adicionar à sacola" (tamanho quando houver).
// Peça que saiu do catálogo ou está esgotada aparece marcada como indisponível.
export function WishlistGrid({ entries }: { entries: Entry[] }) {
  return (
    <ul role="list" className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-5">
      {entries.map((entry) => (
        <li key={entry.key}>{entry.product ? <Item product={entry.product} categoryName={entry.categoryName} /> : <Missing />}</li>
      ))}
    </ul>
  );
}

function Missing() {
  return (
    <div data-unavailable className="flex aspect-[4/5] flex-col items-center justify-center rounded-2xl bg-[#f5f5f3] p-4 text-center text-black">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">Indisponível</p>
      <p className="mt-2 text-sm text-black/60">Esta peça saiu do catálogo.</p>
    </div>
  );
}

function Item({ product, categoryName }: { product: Product; categoryName?: string }) {
  const { addItem } = useCart();
  const available = product.variants.filter((variant) => variant.stock > 0);
  const single = product.variants.length === 1;
  const [sku, setSku] = useState(single && available.length ? available[0].sku : "");
  const [error, setError] = useState("");
  const soldOut = available.length === 0;
  const href = `/produtos/${product.slug}`;
  const add = (button: HTMLButtonElement) => {
    const variant = product.variants.find((item) => item.sku === sku);
    if (!variant) {
      setError("Escolha o tamanho.");
      return;
    }
    setError("");
    addItem(product, variant, 1, button);
  };
  return (
    <article className="flex h-full flex-col text-black" data-fly-scope data-unavailable={soldOut || undefined}>
      <Link href={href} className="relative isolate block aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e8e4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black" tabIndex={-1} aria-hidden="true">
        {product.images[0] && <Image src={product.images[0].src} alt="" data-fly-image fill sizes="(min-width: 1024px) 25vw, 50vw" quality={75} className={`object-cover ${soldOut ? "opacity-50" : ""}`} />}
        {soldOut && <span className="absolute left-3 top-3 rounded-md bg-black px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">Esgotado</span>}
      </Link>
      {categoryName && <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-black/60">{categoryName}</p>}
      <h3 className={`${categoryName ? "mt-1" : "mt-4"} text-sm font-medium sm:text-base`}>{product.name}</h3>
      <p className="mt-1 text-sm text-black/65">{formatPrice(product.priceCents)}</p>
      <div className="mt-3 flex flex-col gap-2">
        {!single && !soldOut && (
          <>
            <label className="sr-only" htmlFor={`tam-${product.slug}`}>Tamanho de {product.name}</label>
            <select id={`tam-${product.slug}`} value={sku} onChange={(event) => setSku(event.target.value)} className="min-h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-black outline-none focus-visible:border-black">
              <option value="">Tamanho</option>
              {product.variants.map((variant) => (
                <option key={variant.sku} value={variant.sku} disabled={variant.stock <= 0}>{variant.size}{variant.stock <= 0 ? " (esgotado)" : ""}</option>
              ))}
            </select>
          </>
        )}
        <button type="button" disabled={soldOut} onClick={(event) => add(event.currentTarget)} className="min-h-11 rounded-xl bg-[#b94f01] px-3 text-sm font-medium text-white transition hover:bg-[#9f4300] disabled:cursor-not-allowed disabled:bg-black/25" aria-label={soldOut ? `${product.name} indisponível` : `Adicionar ${product.name} à sacola`}>
          {soldOut ? "Indisponível" : "Adicionar à sacola"}
        </button>
        <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-black/15 px-3 text-sm font-medium transition hover:border-black">Ver produto</Link>
        {error && <p role="alert" className="text-xs text-[#b42318]">{error}</p>}
      </div>
    </article>
  );
}
