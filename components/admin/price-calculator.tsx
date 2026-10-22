"use client";

import { useEffect, useState } from "react";
import { toCents } from "@/lib/admin/product-schema";
import { DEFAULT_PRICING, netMargin, suggestedPrice, type PricingParams } from "@/lib/admin/pricing";
import { formatPrice } from "@/lib/format";

const STORAGE_KEY = "apex:admin:precificacao:v1";
const field = "w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black/10";
const reais = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

// Calculadora de preço (refino 2, item 6): custo + frete do fornecedor + taxas do pagamento + impostos + margem desejada
// → preço sugerido e margem líquida do preço atual. Os parâmetros ficam no navegador de quem administra (localStorage);
// o preço do produto continua editável e só muda com "Usar o preço sugerido". Cálculo em lib/admin/pricing.ts.
export function PriceCalculator({ cost, supplierShipping, price, onUsePrice }: { cost: string; supplierShipping: string; price: string; onUsePrice: (value: string) => void }) {
  const [params, setParams] = useState<PricingParams>(DEFAULT_PRICING);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê a preferência salva só depois de montar (sem hydration mismatch)
      if (saved && typeof saved === "object") setParams({ ...DEFAULT_PRICING, ...saved });
    } catch {}
  }, []);

  const update = (patch: Partial<PricingParams>) =>
    setParams((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  const costCents = toCents(cost);
  const shippingCents = toCents(supplierShipping) ?? 0;
  const priceCents = toCents(price);
  const ready = costCents !== null && !Number.isNaN(costCents) && !Number.isNaN(shippingCents);
  const input = { costCents: ready ? costCents : 0, supplierShippingCents: ready ? shippingCents : 0 };
  const suggestion = ready ? suggestedPrice(input, params) : null;
  const current = ready && priceCents && !Number.isNaN(priceCents) ? netMargin(priceCents, input, params) : null;

  const numberField = (key: keyof PricingParams, text: string, cents = false) => (
    <div>
      <label htmlFor={`calc-${key}`} className="mb-1 block text-[11px] font-medium text-black/70">{text}</label>
      <input
        id={`calc-${key}`}
        inputMode="decimal"
        className={field}
        value={cents ? reais(params[key]) : String(params[key]).replace(".", ",")}
        onChange={(e) => {
          const value = Number(e.target.value.replace(/\./g, "").replace(",", "."));
          if (Number.isFinite(value) && value >= 0) update({ [key]: cents ? Math.round(value * 100) : value } as Partial<PricingParams>);
        }}
      />
    </div>
  );

  return (
    <div className="mt-6 rounded-xl bg-[#f5f5f3] p-4">
      <h3 className="text-sm font-medium">Calculadora de preço</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {numberField("feePercent", "Taxa do pagamento (%)")}
        {numberField("feeFixedCents", "Taxa fixa (R$)", true)}
        {numberField("taxPercent", "Impostos (%)")}
        {numberField("marginPercent", "Margem desejada (%)")}
      </div>
      {!ready ? (
        <p className="mt-3 text-xs text-black/60">Informe o custo para ver o preço sugerido.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-live="polite">
          <div className="rounded-xl bg-white p-3">
            <p className="text-[11px] text-black/60">Preço sugerido</p>
            {suggestion ? (
              <>
                <p className="font-display text-2xl tracking-[-0.04em]">{formatPrice(suggestion)}</p>
                <button type="button" onClick={() => onUsePrice(reais(suggestion))} className="mt-2 rounded-xl border border-black/15 px-3 py-1.5 text-xs font-medium hover:border-black">Usar o preço sugerido</button>
              </>
            ) : (
              <p className="mt-1 text-sm text-[#b42318]">Taxas + impostos + margem passam de 100%.</p>
            )}
          </div>
          <div className="rounded-xl bg-white p-3">
            <p className="text-[11px] text-black/60">Margem líquida no preço atual</p>
            {current ? (
              <>
                <p className={`font-display text-2xl tracking-[-0.04em] ${current.cents < 0 ? "text-[#b42318]" : ""}`}>{formatPrice(current.cents)}</p>
                <p className="text-xs text-black/60">{current.percent.toFixed(1).replace(".", ",")}% do preço · taxas e impostos {formatPrice(current.feesCents)}</p>
              </>
            ) : (
              <p className="mt-1 text-xs text-black/60">Informe o preço do produto.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
