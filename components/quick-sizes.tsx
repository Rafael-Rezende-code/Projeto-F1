"use client";

import { useCart } from "@/components/cart";
import type { Product } from "@/lib/catalog/types";

// Chips de tamanho para compra rápida no card (só no desktop, aparecem no hover/foco do card).
// Tamanho esgotado fica desabilitado; clicar adiciona aquela variante à sacola.
export function QuickSizes({ product, className = "" }: { product: Product; className?: string }) {
  const { addItem } = useCart();
  return (
    <div role="group" aria-label={`Comprar ${product.name}: escolha o tamanho`} className={className}>
      {product.variants.map((variant) => {
        const out = variant.stock === 0;
        return (
          <button
            key={variant.sku}
            type="button"
            disabled={out}
            onClick={() => addItem(product, variant, 1)}
            aria-label={out ? `${variant.size}, esgotado` : `Adicionar ${product.name}, tamanho ${variant.size}, à sacola`}
            className="flex h-9 min-w-9 flex-1 items-center justify-center rounded-xl bg-white/95 px-2 text-xs font-medium text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-black/40 disabled:line-through"
          >
            {variant.size}
          </button>
        );
      })}
    </div>
  );
}
