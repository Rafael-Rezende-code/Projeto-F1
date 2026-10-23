"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Loader2, TicketPercent, X } from "lucide-react";
import { previewCoupon, type CouponPreview } from "@/app/(loja)/checkout/actions";
import { COUPON_STORAGE_KEY } from "@/lib/coupons";
import { formatPrice } from "@/lib/format";

// Campo "Cupom" (operação, fase 1c) na sacola e no checkout. A prévia vem do servidor (previewCoupon: subtotal pelo
// catálogo, banco pelo código); o desconto que vale é o calculado pela create_order ao fechar o pedido. O código aplicado
// fica no navegador (apex:cupom:v1) para seguir da sacola para o checkout. Sem Supabase (pedidos simulados), não aparece.
type Applied = Extract<CouponPreview, { ok: true }>;

const read = () => {
  try {
    return window.localStorage.getItem(COUPON_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};
const write = (code: string) => {
  try {
    if (code) window.localStorage.setItem(COUPON_STORAGE_KEY, code);
    else window.localStorage.removeItem(COUPON_STORAGE_KEY);
  } catch {}
  window.dispatchEvent(new Event("apex:cupom"));
};
const subscribe = (listener: () => void) => {
  window.addEventListener("apex:cupom", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("apex:cupom", listener);
    window.removeEventListener("storage", listener);
  };
};

export function CouponField({
  items,
  cep,
  shippingId,
  onApplied,
  className = "",
}: {
  items: { sku: string; quantity: number }[];
  cep?: string;
  shippingId?: string;
  onApplied?: (applied: Applied | null) => void;
  className?: string;
}) {
  const saved = useSyncExternalStore(subscribe, read, () => "");
  const [typed, setTyped] = useState("");
  const [applied, setApplied] = useState<Applied | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const report = useRef(onApplied);
  useEffect(() => {
    report.current = onApplied;
  }, [onApplied]);

  const run = (code: string) =>
    start(async () => {
      setError("");
      const result = await previewCoupon({ code, items, cep, shippingId });
      if (result.ok) {
        setApplied(result);
        write(result.code);
        report.current?.(result);
      } else {
        setApplied(null);
        setError(result.message);
        report.current?.(null);
      }
    });

  // Cupom salvo (veio da sacola) ou mudança da sacola/frete: confere de novo no servidor.
  const key = `${saved}|${items.map((item) => `${item.sku}:${item.quantity}`).join(",")}|${cep ?? ""}|${shippingId ?? ""}`;
  useEffect(() => {
    if (saved && items.length) run(saved);
    // `key` resume tudo o que muda a prévia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const remove = () => {
    write("");
    setApplied(null);
    setTyped("");
    setError("");
    report.current?.(null);
  };

  return (
    <div className={className}>
      {applied ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-black/10">
          <span className="flex items-center gap-2">
            <TicketPercent size={16} aria-hidden="true" />
            <span>
              <span className="font-medium">{applied.code}</span>
              <span className="block text-xs text-black/60">
                {applied.shippingDiscountCents > 0 ? "Frete grátis" : applied.discountCents > 0 ? `−${formatPrice(applied.discountCents)}` : "Frete grátis ao escolher a entrega"}
              </span>
            </span>
          </span>
          <button type="button" onClick={remove} aria-label={`Remover o cupom ${applied.code}`} className="rounded-xl p-2 text-black/60 transition hover:bg-black/5 hover:text-black">
            <X size={16} />
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (typed.trim()) run(typed);
          }}
        >
          <label htmlFor="cupom" className="mb-1.5 block text-xs font-medium text-black/70">Cupom</label>
          <div className="flex gap-2">
            <input
              id="cupom"
              value={typed}
              onChange={(event) => setTyped(event.target.value.toUpperCase())}
              autoComplete="off"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "cupom-erro" : undefined}
              className="w-0 min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-base uppercase outline-none focus-visible:border-black sm:text-sm"
            />
            <button type="submit" disabled={pending || !typed.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/15 bg-white px-4 text-sm font-medium transition hover:border-black disabled:opacity-60">
              {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Aplicar
            </button>
          </div>
        </form>
      )}
      <p id="cupom-erro" aria-live="polite" className="mt-1.5 min-h-4 text-xs text-[#b42318]">{error}</p>
    </div>
  );
}
