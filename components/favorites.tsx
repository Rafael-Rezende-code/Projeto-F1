"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";

// Favoritos: lista de slugs no localStorage (com try/catch; sem armazenamento, fica só na memória da página).
// useSyncExternalStore mantém todos os botões e a página /favoritos em sincronia, inclusive entre abas.
const KEY = "apex:favoritos:v1";
const EVENT = "apex:favoritos";
let memory: string[] = [];
let cache: { raw: string | null; list: string[] } = { raw: null, list: [] };

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cache.raw) return cache.list;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    cache = { raw, list };
    return list;
  } catch {
    return memory;
  }
}

function write(list: string[]) {
  memory = list;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // armazenamento bloqueado: segue só na memória
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => event.key === KEY && callback();
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: string[] = [];

export function useFavorites() {
  // No servidor e na hidratação, lista vazia; depois, o que estiver salvo.
  const favorites = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((slug: string) => {
    const current = read();
    write(current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  }, []);
  return { favorites, toggle, has: (slug: string) => favorites.includes(slug) };
}

export function FavoriteButton({ slug, name, className = "" }: { slug: string; name: string; className?: string }) {
  const { has, toggle } = useFavorites();
  const active = has(slug);
  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={active}
      aria-label={active ? `Remover ${name} dos favoritos` : `Adicionar ${name} aos favoritos`}
      className={className}
    >
      <Heart size={16} strokeWidth={1.5} className={`transition ${active ? "fill-[#b94f01] text-[#b94f01]" : ""}`} />
    </button>
  );
}
