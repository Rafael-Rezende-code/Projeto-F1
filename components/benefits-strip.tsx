import { Clock, CreditCard, MapPin, Truck } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { LOCAL_DELIVERY } from "@/lib/shipping/config";
import { storeBenefits, storePolicy, type Benefit } from "@/lib/store-policy";

// Faixa de benefícios logo abaixo do hero (refino 3, item 1.6). Discreta e SÓ com o que a loja configurou em
// lib/store-policy.ts (frete grátis, parcelas sem juros, prazo de postagem) e lib/shipping/config.ts (entrega local).
// Nenhum item configurado = a faixa não existe no HTML.
const ICONS: Record<Benefit["key"], typeof Truck> = { frete: Truck, parcelas: CreditCard, local: MapPin, prazo: Clock };

export function BenefitsStrip() {
  const items = storeBenefits(storePolicy, LOCAL_DELIVERY, formatPrice);
  if (!items.length) return null;
  return (
    <section aria-label="Benefícios da loja" className="border-b border-black/10 bg-white px-5 py-4 sm:px-10">
      <ul className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-black/70 sm:text-sm">
        {items.map((item) => {
          const Icon = ICONS[item.key];
          return (
            <li key={item.key} className="flex items-center gap-2">
              <Icon size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-[#b94f01]" />
              <span>
                <span className="font-medium text-black">{item.title}</span>
                {item.detail && <span className="text-black/60"> · {item.detail}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
