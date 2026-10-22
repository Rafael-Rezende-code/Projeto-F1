"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Botão "copiar" (Pix copia e cola, linha digitável do boleto). Avisa o leitor de tela pelo aria-live.
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#b94f01] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copiado" : label}</span>
    </button>
  );
}
