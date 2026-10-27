"use client";

import { useSyncExternalStore } from "react";
import type { ProductDrop } from "@/lib/drops";

// Liberação do drop no navegador (loja extra, item 6): no HTML do servidor vale o que o servidor calculou
// (drop.released); depois, um relógio de 15 s confere a hora e abre a compra sozinho no lançamento.
const tick = (callback: () => void) => {
  const id = window.setInterval(callback, 15_000);
  return () => window.clearInterval(id);
};

export function useDropReleased(drop: ProductDrop | undefined) {
  return useSyncExternalStore(
    tick,
    () => (drop ? Date.now() >= new Date(drop.launchAt).getTime() : true),
    () => (drop ? drop.released : true),
  );
}

/** Selo do card: "Em breve" antes do lançamento, "Pré-venda" depois (só no modo pré-venda). */
export function DropBadge({ drop }: { drop: ProductDrop }) {
  const released = useDropReleased(drop);
  if (released && drop.mode !== "pre_venda") return null;
  return (
    <span className={`rounded-md px-2 py-1 text-[9px] font-semibold tracking-[0.16em] ${released ? "bg-white text-black ring-1 ring-black/15" : "bg-black text-white"}`}>
      {released ? "PRÉ-VENDA" : "EM BREVE"}
    </span>
  );
}

const secondTick = (callback: () => void) => {
  const id = window.setInterval(callback, 1000);
  return () => window.clearInterval(id);
};

/** Contagem regressiva do lançamento (mesmas caixas no servidor, com "--": sem salto de layout). */
export function DropCountdown({ launchAt, dark = false }: { launchAt: string; dark?: boolean }) {
  const seconds = useSyncExternalStore(secondTick, () => Math.floor(Date.now() / 1000), () => null);
  const total = seconds === null ? null : Math.max(0, new Date(launchAt).getTime() - seconds * 1000);
  const parts = total === null ? null : [Math.floor(total / 86_400_000), Math.floor((total % 86_400_000) / 3_600_000), Math.floor((total % 3_600_000) / 60_000), Math.floor((total % 60_000) / 1000)];
  return (
    <dl className="grid max-w-sm grid-cols-4 gap-2" aria-label="Tempo até o lançamento">
      {["dias", "horas", "min", "seg"].map((label, index) => (
        <div key={label} className={`flex flex-col items-center rounded-xl px-2 py-2.5 ${dark ? "bg-white/10" : "bg-white"}`}>
          <dd className="font-display order-1 text-2xl tabular-nums leading-none">{parts ? String(parts[index]).padStart(2, "0") : "--"}</dd>
          <dt className={`order-2 mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${dark ? "text-white/70" : "text-black/60"}`}>{label}</dt>
        </div>
      ))}
    </dl>
  );
}
