"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Sinais entre componentes de uma mesma página para coreografar entradas (ex.: a foto principal do piloto avisa quando
// começa a aparecer e a assinatura entra logo depois). Um Set global de sinais disparados + ouvintes; sem contexto.
const fired = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function fireCue(name: string) {
  if (fired.has(name)) return;
  fired.add(name);
  notify();
}

/** Esquece o sinal (ao desmontar quem o dispara): numa nova visita à página a coreografia recomeça. */
export function clearCue(name: string) {
  if (fired.delete(name)) notify();
}

/**
 * true quando o sinal `name` foi disparado (ou depois de `fallbackMs`, para nunca travar a entrada se a imagem falhar).
 * Sem `name`, true desde o início.
 */
export function useCue(name: string | undefined, fallbackMs = 2500) {
  const firedNow = useSyncExternalStore(subscribe, () => (name ? fired.has(name) : true), () => !name);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!name) return;
    const timer = window.setTimeout(() => setTimedOut(true), fallbackMs);
    return () => window.clearTimeout(timer);
  }, [name, fallbackMs]);
  return firedNow || timedOut;
}
