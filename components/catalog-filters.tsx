"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { PRICE_RANGES, SORT_OPTIONS } from "@/lib/catalog/filters";

type Option = { value: string; label: string };

// Filtros do catálogo: um <form method="get"> comum (funciona sem JS, URL compartilhável). Com JS, cada mudança
// navega na hora (router.push), sem precisar do botão "Aplicar".
export function CatalogFilters({
  current,
  categories,
  teams,
  drivers,
}: {
  current: { q?: string; categoria?: string; equipe?: string; piloto?: string; preco?: string; ordem: string };
  categories: Option[];
  teams: Option[];
  drivers: Option[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const submit = () => {
    const form = formRef.current;
    if (!form) return;
    const query = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value && !(key === "ordem" && value === "relevancia")) query.set(key, value);
    }
    const text = query.toString();
    router.push(text ? `/produtos?${text}` : "/produtos", { scroll: false });
  };

  const field =
    "w-full appearance-none rounded-xl border border-black/15 bg-white px-4 py-3 pr-9 text-sm text-black transition hover:border-black/40 focus-visible:border-black focus-visible:outline-none";
  const select = (name: string, label: string, value: string | undefined, options: Option[], all: string | null) => (
    <label className="relative block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">{label}</span>
      <select name={name} defaultValue={value ?? ""} onChange={submit} className={field}>
        {all !== null && <option value="">{all}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute bottom-3.5 right-4 text-xs text-black/60">
        ▾
      </span>
    </label>
  );

  return (
    <form
      ref={formRef}
      method="get"
      action="/produtos"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      // key: recria os selects quando a URL muda por um link (ex.: "Limpar filtros")
      key={JSON.stringify(current)}
      className="grid grid-cols-2 gap-3 lg:grid-cols-5"
      aria-label="Filtrar e ordenar produtos"
    >
      {/* mantém a busca ao trocar os outros filtros */}
      {current.q && <input type="hidden" name="q" value={current.q} />}
      {select("categoria", "Categoria", current.categoria, categories, "Todas")}
      {select("equipe", "Equipe", current.equipe, teams, "Todas")}
      {select("piloto", "Piloto", current.piloto, drivers, "Todos")}
      {select("preco", "Preço", current.preco, PRICE_RANGES.map(({ value, label }) => ({ value, label })), "Qualquer")}
      <div className="col-span-2 lg:col-span-1">{select("ordem", "Ordenar por", current.ordem, SORT_OPTIONS, null)}</div>
      <noscript>
        <button type="submit" className="rounded-xl bg-black px-5 py-3 text-xs font-medium text-white">
          Aplicar filtros
        </button>
      </noscript>
    </form>
  );
}
