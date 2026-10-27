"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

// Compartilhar (refino 3, item 2.6): Web Share API quando existe (celular); senão, copia o link. O resultado é anunciado
// para leitores de tela. Cancelar o compartilhamento não é erro.
export function ShareButton({ title, url, className = "" }: { title: string; url: string; className?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const share = async () => {
    const link = new URL(url, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url: link });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    window.setTimeout(() => setStatus("idle"), 2500);
  };
  return (
    <span className="relative inline-flex">
      <button type="button" onClick={share} aria-label={`Compartilhar ${title}`} className={className}>
        {status === "copied" ? <Check size={18} strokeWidth={1.5} aria-hidden="true" /> : <Share2 size={18} strokeWidth={1.5} aria-hidden="true" />}
      </button>
      <span role="status" aria-live="polite" className={status === "idle" ? "sr-only" : "absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-xs text-white"}>
        {status === "copied" ? "Link copiado" : status === "error" ? "Não foi possível copiar" : ""}
      </span>
    </span>
  );
}
