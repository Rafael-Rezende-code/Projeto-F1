"use client";

import { useState, useTransition } from "react";
import { Loader2, Truck } from "lucide-react";
import { quoteShipping } from "@/app/(loja)/checkout/actions";
import { readSavedCep, saveCep } from "@/lib/cep-storage";
import type { DeliveryOption } from "@/lib/checkout/shipping";
import { formatPrice } from "@/lib/format";
import { isValidCep, maskCep, onlyDigits } from "@/lib/validators/br";

// "Calcular frete" (operação, fase 1b) na página de produto e no carrinho. Cota no SERVIDOR (quoteShipping: preço,
// pacote e prazo de envio vêm do catálogo, com o prazo de produto sob encomenda somado em "Chega em"). O CEP é conferido
// no ViaCEP (inexistente → mensagem); se o ViaCEP estiver fora do ar, a cotação segue assim mesmo. O último CEP fica no
// navegador e o checkout o reaproveita.
export function ShippingEstimator({ items, className = "" }: { items: { sku: string; quantity: number }[]; className?: string }) {
  // O CEP salvo entra no foco do campo (ler no primeiro render daria diferença com o HTML do servidor).
  const [cep, setCep] = useState("");
  const [place, setPlace] = useState("");
  const [options, setOptions] = useState<DeliveryOption[] | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const calculate = () =>
    start(async () => {
      setError("");
      setOptions(null);
      setPlace("");
      if (!isValidCep(cep)) {
        setError("Digite um CEP com 8 números.");
        return;
      }
      if (!items.length) {
        setError("Escolha um produto primeiro.");
        return;
      }
      const digits = onlyDigits(cep);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: AbortSignal.timeout(6000) });
        const data = (await response.json()) as { erro?: unknown; localidade?: string; uf?: string };
        if (data.erro) {
          setError("CEP não encontrado. Confira os números.");
          return;
        }
        if (data.localidade) setPlace(`${data.localidade}/${data.uf}`);
      } catch {
        // ViaCEP indisponível: a cotação não depende dele
      }
      try {
        const result = await quoteShipping({ cep: digits, items });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        saveCep(digits);
        setOptions(result.options);
      } catch {
        setError("Não foi possível calcular agora. Confira a conexão e tente de novo.");
      }
    });

  return (
    <div className={className}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          calculate();
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="calcular-frete" className="flex items-center gap-2 text-sm font-medium">
          <Truck size={16} strokeWidth={1.6} aria-hidden="true" /> Calcular frete
        </label>
        <div className="flex gap-2">
          <input
            id="calcular-frete"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={cep}
            onChange={(event) => setCep(maskCep(event.target.value))}
            onFocus={() => {
              if (!cep) setCep(maskCep(readSavedCep()));
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "calcular-frete-erro" : undefined}
            className="min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-base outline-none focus-visible:border-black sm:text-sm"
          />
          <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/15 bg-white px-4 text-sm font-medium transition hover:border-black disabled:opacity-60">
            {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Calcular
          </button>
        </div>
      </form>
      <div aria-live="polite">
        {error && <p id="calcular-frete-erro" className="mt-2 text-xs text-[#b42318]">{error}</p>}
        {options && (
          <ul role="list" className="mt-3 divide-y divide-black/10 rounded-xl border border-black/10 bg-white text-sm">
            {place && <li className="px-4 py-2 text-xs text-black/60">Para {place}</li>}
            {options.map((option) => (
              <li key={option.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span>
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-xs text-black/60">{option.days}</span>
                </span>
                <span className="whitespace-nowrap">{option.priceCents === 0 ? "Grátis" : formatPrice(option.priceCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
