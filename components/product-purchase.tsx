"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/components/cart";
import { FavoriteButton } from "@/components/favorites";
import { StockAlertForm } from "@/components/stock-alert-form";
import { formatPrice } from "@/lib/format";
import { lowStockCount } from "@/lib/store-policy";
import type { Product } from "@/lib/catalog/types";

// Seletor de tamanho (rádios), quantidade e "Adicionar à sacola". A quantidade nunca passa do estoque da variante.
// Refino 3: tamanho ESGOTADO continua escolhível (riscado + "esgotado"): escolhê-lo mostra o "Avise-me quando chegar"
// (components/stock-alert-form.tsx) no lugar de poder comprar. "Restam N unidades" quando o estoque da variante escolhida
// (ou do tamanho único) é ≤ o limite da política (lib/store-policy.ts, padrão 5). Microinterações (lib/motion.ts): realce
// que DESLIZA até o tamanho escolhido (transform) e o número da quantidade que pulsa ao mudar.
// No celular, quando o botão principal sai da tela, aparece uma barra fixa de compra logo acima do dock.
export function ProductPurchase({ product, alertsEnabled = false }: { product: Product; alertsEnabled?: boolean }) {
  const { addItem } = useCart();
  const available = product.variants.filter((variant) => variant.stock > 0);
  const single = product.variants.length === 1;
  const [sku, setSku] = useState<string | null>(single ? product.variants[0].sku : null);
  const [quantity, setQuantity] = useState(1);
  const [bump, setBump] = useState(0);
  const [error, setError] = useState("");
  const variant = product.variants.find((item) => item.sku === sku) ?? null;
  const variantOut = variant !== null && variant.stock === 0;
  const max = variant && variant.stock > 0 ? variant.stock : 1;
  const soldOut = available.length === 0;
  const low = lowStockCount(variant?.stock);
  const mainRef = useRef<HTMLDivElement>(null);
  const sizesRef = useRef<HTMLFieldSetElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const [showBar, setShowBar] = useState(false);
  // Nome do grupo de rádios único na página (o React reclama se outro grupo, ex. um clone do streaming, usar o mesmo nome).
  const groupName = `tamanho-${useId()}`;

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    // Barra fixa (celular) só depois que o botão principal SAI POR CIMA da tela. A área observada se estende muito para
    // baixo: o botão conta como "dentro" enquanto estiver na tela ou abaixo dela, e o estado só muda ao cruzar a borda de
    // cima. (Com a área normal, um salto direto de baixo para o topo, por âncora ou botão de topo, não mudava o estado e
    // a barra ficava presa na tela.)
    const observer = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting), { rootMargin: "0px 0px 100000px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Realce deslizante: posição e tamanho do tamanho escolhido, escritos direto no estilo (sem re-render por quadro).
  // A primeira posição entra sem animar; as trocas animam (transform, duração curta).
  const placed = useRef(false);
  useLayoutEffect(() => {
    const list = listRef.current;
    const highlight = highlightRef.current;
    if (!list || !highlight) return;
    const place = () => {
      const target = sku ? list.querySelector<HTMLElement>(`[data-sku="${CSS.escape(sku)}"]`) : null;
      if (!target) {
        highlight.style.opacity = "0";
        return;
      }
      highlight.style.transition = placed.current ? "" : "none";
      highlight.style.width = `${target.offsetWidth}px`;
      highlight.style.height = `${target.offsetHeight}px`;
      highlight.style.transform = `translate3d(${target.offsetLeft}px, ${target.offsetTop}px, 0)`;
      highlight.style.opacity = variantOut ? "0" : "1";
      placed.current = true;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [sku, variantOut]);

  const choose = (next: string) => {
    setSku(next);
    setError("");
    const stock = product.variants.find((item) => item.sku === next)?.stock ?? 1;
    setQuantity((current) => Math.max(1, Math.min(current, stock || 1)));
  };
  const changeQuantity = (next: number) => {
    setQuantity(next);
    setBump((value) => value + 1);
  };

  const add = (event?: { currentTarget: Element }) => {
    if (!variant) {
      setError("Escolha um tamanho.");
      sizesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      sizesRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      return;
    }
    if (variantOut) return;
    addItem(product, variant, quantity, event?.currentTarget);
  };

  return (
    <div className="flex flex-col gap-6">
      {!single && (
        <fieldset ref={sizesRef}>
          <legend className="mb-3 flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
            Tamanho
            {variant && !variantOut && !low && <span className="normal-case tracking-normal text-black/60">Em estoque</span>}
          </legend>
          <div ref={listRef} className="relative flex flex-wrap gap-2">
            {/* Realce do tamanho escolhido (fica atrás dos rótulos e desliza entre eles). */}
            <span ref={highlightRef} aria-hidden="true" className="size-highlight pointer-events-none absolute left-0 top-0 rounded-xl bg-black opacity-0" />
            {product.variants.map((item) => {
              const out = item.stock === 0;
              const selected = item.sku === sku;
              return (
                <label
                  key={item.sku}
                  data-sku={item.sku}
                  data-out={out || undefined}
                  className={`relative flex h-12 min-w-14 cursor-pointer items-center justify-center rounded-xl border px-4 text-sm transition-colors xl:h-14 xl:min-w-16 xl:text-base has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${
                    out
                      ? `flex-col gap-0.5 bg-black/[0.02] text-black/50 ${selected ? "border-black" : "border-black/10 hover:border-black/40"}`
                      : selected
                        ? "border-black text-white"
                        : "border-black/20 text-black hover:border-black"
                  }`}
                >
                  <input type="radio" name={groupName} value={item.sku} checked={selected} onChange={() => choose(item.sku)} className="sr-only" />
                  {out ? (
                    <>
                      <span className="leading-none line-through">{item.size}</span>
                      {/* Visível: "esgotado" em texto (não só o risco). black/60 = contraste mínimo do site. */}
                      <span className="text-[9px] font-semibold uppercase leading-none tracking-[0.08em] text-black/60">
                        <span className="sr-only">, </span>esgotado
                      </span>
                    </>
                  ) : (
                    <span className="relative">{item.size}</span>
                  )}
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

      {/* Estoque baixo: pelo estoque cadastrado da variante escolhida (ou do tamanho único). */}
      {low !== null && (
        <p role="status" className="-mt-2 text-sm font-medium text-[#b94f01]">
          {low === 1 ? "Resta 1 unidade" : `Restam ${low} unidades`}
          {!single && variant ? ` no tamanho ${variant.size}` : ""}
        </p>
      )}

      {variantOut && variant && <StockAlertForm key={variant.sku} sku={variant.sku} size={single ? undefined : variant.size} enabled={alertsEnabled} />}

      <div ref={mainRef} className="flex items-stretch gap-3">
        <div className="flex items-center rounded-xl border border-black/20" role="group" aria-label="Quantidade">
          <button type="button" onClick={() => changeQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1 || soldOut || variantOut} aria-label="Diminuir quantidade" className="flex h-12 w-11 items-center justify-center rounded-l-xl transition hover:bg-black/5 active:scale-90 disabled:opacity-30 xl:h-14 xl:w-12">
            <Minus size={16} />
          </button>
          <span aria-live="polite" className="w-8 text-center text-sm tabular-nums xl:text-base">
            <span key={bump} className={bump ? "qty-bump inline-block" : "inline-block"}>
              {quantity}
            </span>
          </span>
          <button type="button" onClick={() => changeQuantity(Math.min(max, quantity + 1))} disabled={quantity >= max || soldOut || variantOut} aria-label="Aumentar quantidade" className="flex h-12 w-11 items-center justify-center rounded-r-xl transition hover:bg-black/5 active:scale-90 disabled:opacity-30 xl:h-14 xl:w-12">
            <Plus size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={(event) => add(event)}
          disabled={soldOut || variantOut}
          className="flex-1 whitespace-nowrap rounded-xl bg-[#b94f01] px-3 py-3 text-sm font-medium text-white transition hover:bg-[#9f4300] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-black/20 sm:px-6 xl:text-base"
        >
          {soldOut ? "Esgotado" : variantOut ? "Esgotado neste tamanho" : "Adicionar à sacola"}
        </button>
        <FavoriteButton slug={product.slug} name={product.name} className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-black/20 transition hover:border-black xl:w-14" />
      </div>

      {/* Barra fixa de compra (celular), acima do dock (--dock-space). Só existe quando o botão principal saiu da tela. */}
      {showBar && !soldOut && (
        <div data-buy-bar className="fixed inset-x-0 bottom-[var(--dock-space)] z-[70] border-t border-black/10 bg-white/95 px-5 py-3 text-black backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="text-xs text-black/60">
                {formatPrice(product.priceCents)}
                {variant && !single ? ` · Tam. ${variant.size}` : ""}
              </p>
            </div>
            <button type="button" onClick={(event) => add(event)} disabled={variantOut} className="shrink-0 rounded-xl bg-[#b94f01] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#9f4300] disabled:bg-black/20">
              {variantOut ? "Esgotado" : variant ? "Adicionar" : "Escolher tamanho"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
