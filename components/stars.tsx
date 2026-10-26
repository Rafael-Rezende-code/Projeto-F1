import { Star } from "lucide-react";

// Estrelas de nota (só leitura): o texto vai para leitores de tela; os ícones são decorativos.
export function Stars({ rating, size = 16, label }: { rating: number; size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `Nota ${rating.toString().replace(".", ",")} de 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} size={size} strokeWidth={1.5} aria-hidden="true" className={value <= Math.round(rating) ? "fill-[#b94f01] text-[#b94f01]" : "text-black/25"} />
      ))}
    </span>
  );
}
