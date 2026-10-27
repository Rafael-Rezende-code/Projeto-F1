"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/catalog/types";
import { storePolicy } from "@/lib/store-policy";

type Props = {
  kit: { slug: string; title: string; percent: number };
  products: Product[];
  price: { sumCents: number; discountCents: number; totalCents: number };
};

// Montagem do kit (loja extra, item 2): um tamanho por peça (tamanho único já vem escolhido) e "Adicionar kit à
// sacola". A sacola agrupa as peças como "Kit X" e o servidor aplica o desconto enquanto todas estiverem nela.
export function KitBuilder({ kit, products, price }: Props) {
  const id = useId();
  const { addKit } = useCart();
  const initial = Object.fromEntries(products.map((product) => {
    const available = product.variants.filter((variant) => variant.stock > 0);
    return [product.slug, product.variants.length === 1 && available.length === 1 ? available[0].sku : ""];
  }));
  const [chosen, setChosen] = useState<Record<string, string>>(initial);
  const [error, setError] = useState("");
  const soldOut = products.find((product) => product.variants.every((variant) => variant.stock <= 0));

  const add = (button: HTMLButtonElement) => {
    const missing = products.find((product) => !chosen[product.slug]);
    if (missing) {
      setError(`Escolha o tamanho de ${missing.name}.`);
      document.getElementById(`${id}-${missing.slug}`)?.focus();
      return;
    }
    setError("");
    addKit(products.map((product) => ({ product, variant: product.variants.find((variant) => variant.sku === chosen[product.slug])! })), kit.title, button);
  };

  return (
    <div className="rounded-2xl bg-[#f5f5f3] p-5 text-black sm:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Kit dia de corrida</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <h2 id={`kit-${kit.slug}`} className="text-3xl font-medium tracking-[-0.06em] sm:text-4xl">{kit.title}</h2>
        <p className="text-sm text-black/60">{products.length} peças, {kit.percent}% a menos juntas</p>
      </div>
      <ul role="list" className="mt-8 grid gap-6 sm:grid-cols-3">
        {products.map((product) => {
          const single = product.variants.length === 1;
          return (
            <li key={product.slug} className="flex flex-col">
              <Link href={`/produtos/${product.slug}`} className="group relative isolate block aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e8e4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
                {product.images[0] && <Image src={product.images[0].src} alt={product.images[0].alt} fill sizes="(min-width: 640px) 30vw, 90vw" quality={75} className="object-cover transition-transform duration-[var(--motion-medium)] ease-[var(--ease-out)] group-hover:scale-[1.04]" />}
              </Link>
              <div className="mt-3 flex items-start justify-between gap-3 text-sm">
                <Link href={`/produtos/${product.slug}`} className="font-medium hover:underline">{product.name}</Link>
                <span className="whitespace-nowrap text-black/65">{formatPrice(product.priceCents)}</span>
              </div>
              {single ? (
                <p className="mt-2 text-xs text-black/60">{product.variants[0].stock > 0 ? "Tamanho único" : "Esgotado"}</p>
              ) : (
                <div className="mt-2">
                  <label htmlFor={`${id}-${product.slug}`} className="sr-only">Tamanho de {product.name}</label>
                  <select
                    id={`${id}-${product.slug}`}
                    value={chosen[product.slug]}
                    onChange={(event) => setChosen((current) => ({ ...current, [product.slug]: event.target.value }))}
                    className="min-h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-black outline-none transition hover:border-black/40 focus-visible:border-black"
                  >
                    <option value="">Escolha o tamanho</option>
                    {product.variants.map((variant) => (
                      <option key={variant.sku} value={variant.sku} disabled={variant.stock <= 0}>
                        {variant.size}{variant.stock <= 0 ? " (esgotado)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-8 flex flex-col gap-4 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
          <div className="flex gap-2"><dt className="text-black/60">Separado</dt><dd className="text-black/60 line-through">{formatPrice(price.sumCents)}</dd></div>
          <div className="flex items-baseline gap-2"><dt className="font-medium">No kit</dt><dd className="text-2xl font-medium tracking-[-0.03em]" data-kit-price>{formatPrice(price.totalCents)}</dd></div>
          <div className="flex gap-2 text-[#8a3a00]"><dt>Você economiza</dt><dd className="font-medium">{formatPrice(price.discountCents)}</dd></div>
        </dl>
        <button
          type="button"
          disabled={Boolean(soldOut)}
          onClick={(event) => add(event.currentTarget)}
          className="min-h-12 shrink-0 rounded-xl bg-[#b94f01] px-6 text-sm font-medium text-white transition hover:bg-[#9f4300] disabled:cursor-not-allowed disabled:bg-black/30"
        >
          {soldOut ? "Kit indisponível no momento" : "Adicionar kit à sacola"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-[#b42318]">{error}</p>}
      <p className="mt-3 text-xs text-black/60">O desconto vale enquanto as {products.length} peças estiverem na sacola{storePolicy.couponWithKit ? "" : " e não se soma a cupons"}.</p>
    </div>
  );
}
