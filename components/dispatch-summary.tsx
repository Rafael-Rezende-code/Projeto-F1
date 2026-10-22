import { Clock } from "lucide-react";
import { dispatchSummary } from "@/lib/catalog/fulfillment";
import type { DispatchDays } from "@/lib/catalog/types";

// Prazo de envio da sacola/checkout (refino 2, item 5): o do item mais lento e, quando os prazos diferem, o aviso de
// que o pedido pode chegar em mais de um pacote. Server-safe (sem estado): usado pela sacola e pelo checkout.
export function DispatchSummary({ items, className = "" }: { items: { dispatchDays?: DispatchDays }[]; className?: string }) {
  const summary = dispatchSummary(items);
  if (!summary) return null;
  return (
    <div className={`flex gap-2.5 text-xs leading-5 text-black/70 ${className}`}>
      <Clock size={15} strokeWidth={1.6} aria-hidden="true" className="mt-0.5 shrink-0 text-black" />
      <p>
        Envio estimado em <strong className="font-semibold text-black">{summary.range}</strong>
        {summary.split ? " (prazo do item mais demorado)." : "."}
        {summary.split && " Os itens têm prazos diferentes: o pedido pode chegar em mais de um pacote."}
      </p>
    </div>
  );
}
