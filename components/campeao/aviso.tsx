"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { CAMPEAO_AVISO, CAMPEAO } from "@/lib/campeao";

// Faixa fina de aviso no topo da home ("Kimi Antonelli, campeão mundial 2026 → ver"), dispensável; a escolha fica no
// localStorage. Sem salto de layout: a faixa vive dentro do cabeçalho da home (fora do fluxo, sobre o hero) e, se já foi
// dispensada, um script inline (AVISO_SCRIPT de lib/campeao.ts, posto pela home antes do cabeçalho) injeta no <head> um <style> que a esconde antes da primeira pintura
// (mesma técnica da fonte do hero: nada de atributo no <html>, que o React compara na hidratação).
const KEY = CAMPEAO_AVISO.storageKey;
const listeners = new Set<() => void>();
const read = () => {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

export function CampeaoAviso() {
  const dismissed = useSyncExternalStore(subscribe, read, () => false);
  if (dismissed) return null;
  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {}
    listeners.forEach((listener) => listener());
  };
  return (
    <div id="aviso-campeao" className="campeao-aviso relative flex min-h-9 items-center justify-center bg-[#0d0d0d] px-12 text-[12px] text-white md:pointer-events-auto md:-mx-4 md:-mt-3 md:mb-3">
        <Link href={CAMPEAO.href} className="group inline-flex min-h-9 items-center gap-2 py-1.5 text-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9cf8f]">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[#e9cf8f]" />
          <span>
            {CAMPEAO_AVISO.text} <span className="text-[#e9cf8f]">→ {CAMPEAO_AVISO.cta}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar o aviso do campeão"
          className="absolute right-1.5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#e9cf8f]"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
  );
}
