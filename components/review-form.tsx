"use client";

import { useActionState, useId, useState } from "react";
import { Star } from "lucide-react";
import { submitReview, type ReviewState } from "@/app/(loja)/pedido/consultar/actions";

const INPUT = "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-base text-black outline-none focus-visible:border-black sm:text-sm";

// Formulário de avaliação de um produto do pedido entregue (refino 3, item 2.5), aberto pela consulta de pedido.
// Estrelas = rádios de verdade (teclado: setas trocam a nota). Vai como PENDENTE: só aparece no site depois da moderação.
export function ReviewForm({ orderId, email, slug, name }: { orderId: string; email: string; slug: string; name: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, { status: "idle" });
  const [rating, setRating] = useState(0);
  const id = useId();
  if (state.status === "ok") return <p role="status" className="mt-2 rounded-xl bg-white px-4 py-3 text-sm text-[#1f7a3a]">{state.message}</p>;
  return (
    <details className="group mt-2 rounded-xl border border-black/10 bg-white">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-black [&::-webkit-details-marker]:hidden">
        <Star size={16} strokeWidth={1.5} aria-hidden="true" /> Avaliar {name}
        <span aria-hidden="true" className="ml-auto transition group-open:rotate-45">+</span>
      </summary>
      <form action={action} className="flex flex-col gap-3 px-4 pb-4">
        <input type="hidden" name="pedido" value={orderId} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="produto" value={slug} />
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-black/70">Sua nota</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className="cursor-pointer rounded-md p-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-black">
                <input type="radio" name="nota" value={value} checked={rating === value} onChange={() => setRating(value)} className="sr-only" />
                <Star size={24} strokeWidth={1.5} aria-hidden="true" className={value <= rating ? "fill-[#b94f01] text-[#b94f01]" : "text-black/30"} />
                <span className="sr-only">{value === 1 ? "1 estrela" : `${value} estrelas`}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label htmlFor={`${id}-titulo`} className="text-xs font-medium text-black/70">Título</label>
        <input id={`${id}-titulo`} name="titulo" required maxLength={80} className={INPUT} />
        <label htmlFor={`${id}-texto`} className="text-xs font-medium text-black/70">Sua avaliação</label>
        <textarea id={`${id}-texto`} name="texto" required minLength={10} maxLength={2000} rows={4} className={INPUT} />
        <label htmlFor={`${id}-nome`} className="text-xs font-medium text-black/70">Como seu nome aparece (ex.: Maria S.)</label>
        <input id={`${id}-nome`} name="nome" required minLength={2} maxLength={40} autoComplete="given-name" className={INPUT} />
        <p className="text-xs leading-5 text-black/60">A avaliação aparece na página do produto depois de revisada. Não publique dados pessoais.</p>
        <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-black px-5 text-sm font-medium text-white transition hover:bg-[#b94f01] disabled:opacity-60">
          {pending ? "Enviando…" : "Enviar avaliação"}
        </button>
        {state.status === "error" && <p role="alert" className="text-sm text-[#b42318]">{state.message}</p>}
      </form>
    </details>
  );
}
