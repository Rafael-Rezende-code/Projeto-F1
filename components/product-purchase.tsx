"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/components/cart";
import type { Product } from "@/lib/catalog/types";

// Seletor de tamanho (rádios), quantidade e "Adicionar à sacola". Tamanho esgotado fica desabilitado.
// A quantidade nunca passa do estoque da variante escolhida.
export function ProductPurchase({ product }: { product: Product }) {
  const { addItem } = useCart();
  const available = product.variants.filter((variant) => variant.stock > 0);
  const single = product.variants.length === 1;
  const [sku, setSku] = useState<string | null>(single && available.length ? product.variants[0].sku : null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const variant = product.variants.find((item) => item.sku === sku) ?? null;
  const max = variant?.stock ?? 1;
  const soldOut = available.length === 0;

  const choose = (next: string) => {
    setSku(next);
    setError("");
    const stock = product.variants.find((item) => item.sku === next)?.stock ?? 1;
    setQuantity((current) => Math.min(current, stock));
  };

  const add = () => {
    if (!variant) {
      setError("Escolha um tamanho.");
      return;
    }
    addItem(product, variant, quantity);
  };

  return (
    <div className="flex flex-col gap-6">
      {!single && (
        <fieldset>
          <legend className="mb-3 flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
            Tamanho
            {variant && <span className="normal-case tracking-normal text-black/60">{variant.stock <= 3 ? `Restam ${variant.stock}` : "Em estoque"}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((item) => {
              const out = item.stock === 0;
              const selected = item.sku === sku;
              return (
                <label
                  key={item.sku}
                  className={`relative flex h-12 min-w-14 items-center justify-center rounded-xl border px-4 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${
                    out
                      ? "cursor-not-allowed border-black/10 text-black/30 line-through"
                      : selected
                        ? "cursor-pointer border-black bg-black text-white"
                        : "cursor-pointer border-black/20 hover:border-black"
                  }`}
                >
                  <input type="radio" name="tamanho" value={item.sku} checked={selected} disabled={out} onChange={() => choose(item.sku)} className="sr-only" />
                  {item.size}
                  {out && <span className="sr-only"> (esgotado)</span>}
                </label>
              );
            })}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-[#b42318]">
              {error}
            </p>
          )}
        </fieldset>
      )}

      <div className="flex items-stretch gap-3">
        <div className="flex items-center rounded-xl border border-black/20" role="group" aria-label="Quantidade">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1 || soldOut} aria-label="Diminuir quantidade" className="flex h-12 w-11 items-center justify-center rounded-l-xl transition hover:bg-black/5 disabled:opacity-30">
            <Minus size={16} />
          </button>
          <span aria-live="polite" className="w-8 text-center text-sm tabular-nums">
            {quantity}
          </span>
          <button type="button" onClick={() => setQuantity((q) => Math.min(max, q + 1))} disabled={quantity >= max || soldOut} aria-label="Aumentar quantidade" className="flex h-12 w-11 items-center justify-center rounded-r-xl transition hover:bg-black/5 disabled:opacity-30">
            <Plus size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={soldOut}
          className="flex-1 rounded-xl bg-[#b94f01] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#9f4300] disabled:cursor-not-allowed disabled:bg-black/20"
        >
          {soldOut ? "Esgotado" : "Adicionar à sacola"}
        </button>
      </div>
    </div>
  );
}
