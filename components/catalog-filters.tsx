"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useModal } from "@/components/use-modal";
import {
  activeFacets,
  catalogHref,
  countFacets,
  DELIVERY_OPTIONS,
  PRICE_RANGES,
  SORT_OPTIONS,
  type CatalogParams,
  type FacetItem,
  type FacetKey,
} from "@/lib/catalog/filters";

// Filtros do catálogo (refino 3, itens 3.1 e 3.2). Tudo vai para a URL (compartilhável, funciona sem JS pelo <form
// method="get">). Desktop (lg+): barra lateral recolhível, cada escolha aplica na hora. Celular: gaveta inferior (bottom
// sheet, diálogo modal) em que as escolhas ficam em rascunho, com a contagem em tempo real no botão "Ver N produtos".
// As contagens usam as MESMAS regras do servidor (lib/catalog/filters.ts, matchesFacets) sobre a lista compacta `items`
// (já filtrada pela busca e pela coleção, que não mudam aqui). Os campos da barra lateral têm os nomes dos parâmetros
// (o <form> funciona sem JS); os da gaveta levam prefixo (nomes iguais em dois grupos de rádio confundem o React).
export type Option = { value: string; label: string };
export type FacetOptions = { categories: Option[]; teams: Option[]; drivers: Option[]; sizes: string[] };

type Draft = Pick<CatalogParams, FacetKey>;
const pick = (params: CatalogParams): Draft => ({ categoria: params.categoria, equipe: params.equipe, piloto: params.piloto, tamanho: params.tamanho, preco: params.preco, entrega: params.entrega, disponivel: params.disponivel });

function Fields({ draft, items, options, onChange, idPrefix }: { draft: Draft; items: FacetItem[]; options: FacetOptions; onChange: (key: FacetKey, value: string | undefined) => void; idPrefix: string }) {
  const count = (key: FacetKey, value: string | undefined) => countFacets(items, { ...draft, [key]: value });
  const group = (key: FacetKey, legend: string, list: Option[], all = "Todos") => (
    <fieldset className="border-b border-black/10 py-5 first:pt-0">
      <legend className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">{legend}</legend>
      <div className="flex flex-col gap-1">
        {[{ value: "", label: all }, ...list].map((option) => {
          const value = option.value || undefined;
          const checked = (draft[key] ?? "") === option.value;
          const n = count(key, value);
          const disabled = !checked && n === 0;
          const id = `${idPrefix}-${key}-${option.value || "todos"}`;
          return (
            <label key={id} htmlFor={id} className={`flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-black ${disabled ? "cursor-not-allowed text-black/40" : "cursor-pointer text-black hover:bg-black/5"}`}>
              <input id={id} type="radio" name={idPrefix === "lateral" ? key : `${idPrefix}-${key}`} value={option.value} checked={checked} disabled={disabled} onChange={() => onChange(key, value)} className="size-4 accent-[#b94f01]" />
              <span className="flex-1">{option.label}</span>
              <span className="text-xs tabular-nums text-black/60">{n}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
  return (
    <>
      {group("categoria", "Categoria", options.categories, "Todas")}
      {group("equipe", "Equipe", options.teams, "Todas")}
      {group("piloto", "Piloto", options.drivers)}
      {group("tamanho", "Tamanho", options.sizes.map((size) => ({ value: size, label: size })))}
      {group("preco", "Preço", PRICE_RANGES.map(({ value, label }) => ({ value, label })), "Qualquer")}
      {group("entrega", "Entrega", DELIVERY_OPTIONS.map(({ value, label }) => ({ value, label })), "Pronta entrega e sob encomenda")}
      <fieldset className="py-5">
        <legend className="sr-only">Disponibilidade</legend>
        <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm text-black hover:bg-black/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-black">
          <input type="checkbox" name={idPrefix === "lateral" ? "disponivel" : `${idPrefix}-disponivel`} value="1" checked={draft.disponivel === "1"} onChange={(event) => onChange("disponivel", event.target.checked ? "1" : undefined)} className="size-4 accent-[#b94f01]" />
          <span className="flex-1">Só com estoque</span>
          <span className="text-xs tabular-nums text-black/60">{count("disponivel", "1")}</span>
        </label>
      </fieldset>
    </>
  );
}

/** Barra lateral (desktop): aplica na hora. */
export function CatalogSidebar({ current, items, options }: { current: CatalogParams; items: FacetItem[]; options: FacetOptions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const apply = (key: FacetKey, value: string | undefined) => startTransition(() => router.push(catalogHref(current, { [key]: value }), { scroll: false }));
  return (
    <form method="get" action="/produtos" aria-label="Filtros" aria-busy={pending} onSubmit={(event) => event.preventDefault()} className={`transition-opacity ${pending ? "opacity-60" : ""}`}>
      {current.q && <input type="hidden" name="q" value={current.q} />}
      {current.colecao && <input type="hidden" name="colecao" value={current.colecao} />}
      {current.tag && <input type="hidden" name="tag" value={current.tag} />}
      <Fields draft={pick(current)} items={items} options={options} onChange={apply} idPrefix="lateral" />
      <noscript>
        <button type="submit" className="mt-2 rounded-xl bg-black px-5 py-3 text-xs font-medium text-white">Aplicar filtros</button>
      </noscript>
    </form>
  );
}

/** Contêiner da barra lateral recolhível: o botão "Filtros" mostra/esconde a coluna e a grade ocupa a largura toda. */
export function CatalogLayout({ sidebar, children, activeCount }: { sidebar: React.ReactNode; children: React.ReactNode; activeCount: number }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`catalog-layout ${open ? "" : "is-collapsed"}`}>
      <div className="hidden lg:block">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="catalogo-filtros" className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/15 px-4 text-sm text-black transition hover:border-black">
          <SlidersHorizontal size={16} aria-hidden="true" /> {open ? "Ocultar filtros" : "Mostrar filtros"}
          {activeCount > 0 && <span className="rounded-full bg-black px-1.5 text-[11px] text-white">{activeCount}</span>}
        </button>
        <div id="catalogo-filtros" hidden={!open} className="catalog-sidebar">
          {sidebar}
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Botão + gaveta inferior (celular e tablet): rascunho com contagem ao vivo; "Ver N produtos" aplica. */
export function CatalogSheet({ current, items, options }: { current: CatalogParams; items: FacetItem[]; options: FacetOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => pick(current));
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useModal(open, panelRef, close);
  const total = useMemo(() => countFacets(items, draft), [items, draft]);
  const active = activeFacets(current).length;
  const openSheet = () => {
    setDraft(pick(current));
    setOpen(true);
  };
  const apply = () => {
    setOpen(false);
    router.push(catalogHref(current, draft), { scroll: false });
  };
  return (
    <>
      <button type="button" onClick={openSheet} aria-haspopup="dialog" aria-expanded={open} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/15 px-4 text-sm text-black transition hover:border-black lg:hidden">
        <SlidersHorizontal size={16} aria-hidden="true" /> Filtrar{active > 0 && <span className="rounded-full bg-black px-1.5 text-[11px] text-white">{active}</span>}
      </button>
      <div className={`fixed inset-0 z-[95] lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div onClick={close} className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Filtrar produtos"
          inert={!open}
          className={`sheet absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-2xl bg-white text-black [color-scheme:light] ${open ? "sheet-open" : ""}`}
        >
          <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
            <p className="font-ui text-base font-medium">Filtros</p>
            <button type="button" data-autofocus onClick={close} aria-label="Fechar filtros" className="rounded-xl p-2 transition hover:bg-black/5">
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {/* Os campos só existem com a gaveta aberta (fechada, não pesa na hidratação nem duplica as contagens). */}
            {open && <Fields draft={draft} items={items} options={options} onChange={(key, value) => setDraft((previous) => ({ ...previous, [key]: value }))} idPrefix="gaveta" />}
          </div>
          <div className="flex gap-3 border-t border-black/10 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => setDraft({})} className="min-h-12 rounded-xl border border-black/15 px-5 text-sm text-black transition hover:border-black">
              Limpar
            </button>
            <button type="button" onClick={apply} disabled={total === 0} aria-live="polite" className="min-h-12 flex-1 rounded-xl bg-black px-5 text-sm font-medium text-white transition hover:bg-[#b94f01] disabled:bg-black/30">
              {total === 0 ? "Nenhum produto" : total === 1 ? "Ver 1 produto" : `Ver ${total} produtos`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Ordenação (acima da grade, nos dois tamanhos de tela). */
export function CatalogSort({ current }: { current: CatalogParams }) {
  const router = useRouter();
  return (
    <label className="relative inline-flex items-center gap-2 text-sm text-black/70">
      <span className="hidden sm:inline">Ordenar por</span>
      <span className="sr-only sm:hidden">Ordenar por</span>
      <select
        name="ordem"
        value={current.ordem}
        onChange={(event) => router.push(catalogHref(current, { ordem: event.target.value as CatalogParams["ordem"] }), { scroll: false })}
        className="min-h-11 appearance-none rounded-xl border border-black/15 bg-white py-2 pl-4 pr-9 text-sm text-black transition hover:border-black/40 focus-visible:border-black focus-visible:outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-4 text-xs text-black/60">▾</span>
    </label>
  );
}

/**
 * Chips dos filtros ativos (3.2): remover um some com uma animação curta antes de navegar; "Limpar tudo" tira todos os
 * filtros (mantém a ordenação). Os chips novos entram com a mesma animação (CSS .chip-in / .chip-out).
 */
export function CatalogChips({ chips, clearHref }: { chips: { key: string; label: string; href: string }[]; clearHref: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState<string | null>(null);
  const signature = chips.map((chip) => chip.key).join(",");
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setLeaving(null);
  }
  if (!chips.length) return null;
  const go = (event: React.MouseEvent, key: string, href: string) => {
    event.preventDefault();
    setLeaving(key);
    window.setTimeout(() => router.push(href, { scroll: false }), 160);
  };
  return (
    <ul role="list" aria-label="Filtros ativos" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.key} className={leaving === chip.key || leaving === "*" ? "chip-out" : "chip-in"}>
          <Link href={chip.href} scroll={false} onClick={(event) => go(event, chip.key, chip.href)} aria-label={`Remover filtro ${chip.label}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-black/15 px-3 text-xs text-black transition hover:border-black">
            {chip.label} <X size={12} aria-hidden="true" />
          </Link>
        </li>
      ))}
      <li>
        <Link href={clearHref} scroll={false} onClick={(event) => go(event, "*", clearHref)} className="inline-flex min-h-9 items-center px-1 text-xs text-black/60 underline underline-offset-4 hover:text-black">
          Limpar tudo
        </Link>
      </li>
    </ul>
  );
}

