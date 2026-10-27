"use client";

import { useSyncExternalStore } from "react";
import { BRASILIA, countdown, formatRaceTime, racePhase } from "@/lib/calendar";

// Contador da próxima corrida (loja extra, item 5): leve (um relógio de 1 s por useSyncExternalStore, sem re-render da
// página) e sem salto de layout (no HTML do servidor os números são "--" nas mesmas caixas). Horário no fuso do visitante
// ou de Brasília (escolha guardada neste aparelho).
const ZONE_KEY = "apex:fuso:v1";
const ZONE_EVENT = "apex:fuso";

const tick = (callback: () => void) => {
  const id = window.setInterval(callback, 1000);
  return () => window.clearInterval(id);
};
const nowSeconds = () => Math.floor(Date.now() / 1000);

const readZone = () => {
  try {
    return window.localStorage.getItem(ZONE_KEY) === "brasilia" ? "brasilia" : "local";
  } catch {
    return "local";
  }
};
const subscribeZone = (callback: () => void) => {
  window.addEventListener(ZONE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ZONE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};
const setZone = (zone: "local" | "brasilia") => {
  try {
    window.localStorage.setItem(ZONE_KEY, zone);
  } catch {}
  window.dispatchEvent(new Event(ZONE_EVENT));
};

export function RaceCountdown({ raceStart, dark = false }: { raceStart: string; dark?: boolean }) {
  const seconds = useSyncExternalStore(tick, nowSeconds, () => null);
  const zone = useSyncExternalStore(subscribeZone, readZone, () => "local" as const);
  const now = seconds === null ? null : seconds * 1000;
  const phase = now === null ? "antes" : racePhase({ raceStart }, now);
  const parts = now === null ? null : countdown(raceStart, now);
  const muted = dark ? "text-white/70" : "text-black/60";
  const box = dark ? "bg-white/10" : "bg-white";
  const units = [
    ["dias", parts?.days],
    ["horas", parts?.hours],
    ["min", parts?.minutes],
    ["seg", parts?.seconds],
  ] as const;
  return (
    <div>
      {phase === "antes" ? (
        <dl className="grid grid-cols-4 gap-2 sm:max-w-md" aria-label="Tempo até a largada">
          {units.map(([label, value]) => (
            <div key={label} className={`flex flex-col items-center rounded-xl ${box} px-2 py-3`}>
              <dd className="font-display order-1 text-3xl tabular-nums leading-none sm:text-4xl">{value === undefined ? "--" : String(value).padStart(2, "0")}</dd>
              <dt className={`order-2 mt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${muted}`}>{label}</dt>
            </div>
          ))}
        </dl>
      ) : (
        <p className={`flex min-h-[76px] items-center rounded-xl ${box} px-4 text-sm font-medium sm:max-w-md`} role="status">
          {phase === "agora" ? "Luzes apagadas: a corrida está acontecendo agora." : "Bandeirada dada. A próxima etapa aparece aqui em breve."}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <p className="min-h-5">
          <span className={muted}>Largada: </span>
          {/* Horário só no navegador (depende do fuso do visitante); no HTML do servidor, o espaço já fica reservado. */}
          <span className="font-medium" suppressHydrationWarning>
            {now === null ? "" : formatRaceTime(raceStart, zone === "brasilia" ? BRASILIA : undefined)}
          </span>
          <span className={muted}>{now === null ? "" : zone === "brasilia" ? " (Brasília)" : " (seu horário)"}</span>
        </p>
        <div role="group" aria-label="Fuso do horário" className={`inline-flex rounded-xl p-0.5 text-xs ${dark ? "bg-white/10" : "bg-black/5"}`}>
          {(["local", "brasilia"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={zone === value}
              onClick={() => setZone(value)}
              className={`min-h-9 rounded-[10px] px-3 font-medium transition-colors duration-[var(--motion-short)] ${zone === value ? (dark ? "bg-white text-black" : "bg-black text-white") : muted}`}
            >
              {value === "local" ? "Seu horário" : "Brasília"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
