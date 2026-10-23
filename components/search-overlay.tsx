"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { searchCatalog, searchSuggestions, type SearchHit } from "@/app/actions/search";
import { track } from "@/lib/analytics";
import { useSiteUI } from "@/components/site-ui";
import { useModal } from "@/components/use-modal";
import { formatPrice } from "@/lib/format";

// Busca em tela cheia com resultados enquanto digita (produtos, equipes, pilotos, categorias), via server action que
// usa a camada de repositório do catálogo. Carregada sob demanda por components/search-root.tsx (que tem o botão do
// cabeçalho e o atalho Ctrl/Cmd+K); também abre pelo item Buscar do dock.
// Teclado: setas sobem/descem nos resultados, Enter abre, Esc fecha (padrão combobox + listbox).
type Option = { id: string; href: string; label: string };
type Suggestions = Awaited<ReturnType<typeof searchSuggestions>>;
const EMPTY: SearchHit = { products: [], teams: [], drivers: [], categories: [] };

export function SearchOverlay() {
  const { panel, closePanel } = useSiteUI();
  const open = panel === "busca";
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit>(EMPTY);
  const [searched, setSearched] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const listId = useId();
  useModal(open, panelRef, closePanel, "input");

  // Sugestões (estado vazio) carregadas na primeira abertura.
  useEffect(() => {
    if (open && !suggestions) void searchSuggestions().then(setSuggestions);
  }, [open, suggestions]);

  // Resultados enquanto digita (com pequena espera para não disparar a cada tecla).
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const hit = await searchCatalog(q);
        setResults(hit);
        setSearched(q);
        setActive(0);
      });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Medição (search): só quando a pessoa para de digitar (1,2 s), com 3+ letras, uma vez por termo.
  const lastTracked = useRef("");
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3 || q === lastTracked.current) return;
    const timer = window.setTimeout(() => {
      lastTracked.current = q;
      track({ name: "search", term: q.slice(0, 80) });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const trimmed = query.trim();
  const shown = trimmed ? results : EMPTY;
  const options = useMemo<Option[]>(() => {
    if (!trimmed) return [];
    return [
      ...shown.products.map((p) => ({ id: `p-${p.slug}`, href: `/produtos/${p.slug}`, label: p.name })),
      ...shown.teams.map((t) => ({ id: `t-${t.slug}`, href: `/equipes/${t.slug}`, label: t.name })),
      ...shown.drivers.map((d) => ({ id: `d-${d.slug}`, href: `/pilotos/${d.slug}`, label: d.name })),
      ...shown.categories.map((c) => ({ id: `c-${c.slug}`, href: `/categorias/${c.slug}`, label: c.name })),
    ];
  }, [shown, trimmed]);

  const close = () => {
    closePanel();
    setQuery("");
    setResults(EMPTY);
    setSearched("");
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!options.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(options[active]?.href ?? options[0].href);
    }
  };

  useEffect(() => {
    document.getElementById(`${listId}-${options[active]?.id}`)?.scrollIntoView({ block: "nearest" });
  }, [active, options, listId]);

  const optionProps = (option: Option) => {
    const index = options.findIndex((item) => item.id === option.id);
    return {
      id: `${listId}-${option.id}`,
      role: "option" as const,
      "aria-selected": index === active,
      onMouseEnter: () => setActive(index),
      onClick: (event: React.MouseEvent) => {
        event.preventDefault();
        go(option.href);
      },
      href: option.href,
      className: `flex items-center gap-4 rounded-xl px-3 py-2.5 transition ${index === active ? "bg-black/[0.06]" : ""}`,
    };
  };

  const noResults = trimmed && searched === trimmed && !pending && options.length === 0;
  const group = (title: string, children: React.ReactNode) => (
    <div role="group" aria-label={title} className="mt-6 first:mt-0">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60">{title}</p>
      {children}
    </div>
  );

  return (
    <div className={`fixed inset-0 z-[96] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={close} className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
        inert={!open}
        className={`absolute inset-x-0 top-0 mx-auto flex max-h-[100dvh] w-full max-w-3xl flex-col bg-white text-black shadow-2xl transition-[transform,opacity] duration-[var(--motion-medium)] ease-[var(--ease-out)] [color-scheme:light] sm:top-8 sm:max-h-[calc(100dvh-4rem)] sm:rounded-2xl ${
          open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-black/10 px-5 py-4">
          <Search size={20} strokeWidth={1.5} className="shrink-0 text-black/60" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar produtos, equipes, pilotos…"
            aria-label="Buscar na loja"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listId}
            aria-activedescendant={options.length ? `${listId}-${options[active]?.id}` : undefined}
            aria-autocomplete="list"
            className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-lg placeholder:text-black/40 [&::-webkit-search-cancel-button]:hidden"
          />
          {pending && <Loader2 size={18} className="animate-spin text-black/50" aria-hidden="true" />}
          <kbd className="hidden rounded-md border border-black/15 px-1.5 py-0.5 text-[10px] text-black/60 sm:inline">Esc</kbd>
          <button type="button" onClick={close} aria-label="Fechar busca" className="rounded-xl p-2 transition hover:bg-black/5">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <p className="sr-only" aria-live="polite">
            {trimmed && searched === trimmed ? (options.length ? `${options.length} resultados` : "Nenhum resultado") : ""}
          </p>

          {!trimmed && (
            <div className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60">Equipes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions?.teams.map((team) => (
                  <Link key={team.slug} href={`/equipes/${team.slug}`} onClick={close} className="flex items-center gap-2 rounded-xl border border-black/15 px-3 py-2 text-sm transition hover:border-black">
                    <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                    {team.name}
                  </Link>
                ))}
              </div>
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60">Pilotos</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions?.drivers.map((driver) => (
                  <Link key={driver.slug} href={`/pilotos/${driver.slug}`} onClick={close} className="rounded-xl border border-black/15 px-3 py-2 text-sm transition hover:border-black">
                    {driver.name}
                  </Link>
                ))}
              </div>
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60">Categorias</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions?.categories.map((category) => (
                  <Link key={category.slug} href={`/categorias/${category.slug}`} onClick={close} className="rounded-xl border border-black/15 px-3 py-2 text-sm transition hover:border-black">
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {noResults && (
            <div className="px-3 py-14 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Nada no radar</p>
              <p className="mt-3 text-2xl font-medium tracking-[-0.04em]">Nenhum resultado para “{trimmed}”.</p>
              <p className="mt-2 text-sm text-black/60">Tente o nome de uma equipe, de um piloto ou de um tipo de peça.</p>
            </div>
          )}

          {options.length > 0 && (
            <div id={listId} role="listbox" aria-label="Resultados">
              {shown.products.length > 0 &&
                group(
                  "Produtos",
                  shown.products.map((product) => (
                    <a key={product.slug} {...optionProps({ id: `p-${product.slug}`, href: `/produtos/${product.slug}`, label: product.name })}>
                      <span className="relative aspect-[4/5] w-11 shrink-0 overflow-hidden rounded-lg bg-[#e9e8e4]">
                        {product.image && <Image src={product.image} alt="" fill sizes="44px" quality={75} className="object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{product.name}</span>
                        <span className="block truncate text-xs text-black/60">{product.detail}</span>
                      </span>
                      <span className="whitespace-nowrap text-sm">{formatPrice(product.priceCents)}</span>
                    </a>
                  )),
                )}
              {shown.teams.length > 0 &&
                group(
                  "Equipes",
                  shown.teams.map((team) => (
                    <a key={team.slug} {...optionProps({ id: `t-${team.slug}`, href: `/equipes/${team.slug}`, label: team.name })}>
                      <span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: team.color }} />
                      <span className="flex-1 text-sm font-medium">{team.name}</span>
                      <ArrowRight size={14} className="text-black/40" aria-hidden="true" />
                    </a>
                  )),
                )}
              {shown.drivers.length > 0 &&
                group(
                  "Pilotos",
                  shown.drivers.map((driver) => (
                    <a key={driver.slug} {...optionProps({ id: `d-${driver.slug}`, href: `/pilotos/${driver.slug}`, label: driver.name })}>
                      <span className="flex-1 text-sm font-medium">{driver.name}</span>
                      <span className="text-xs text-black/60">{driver.team}</span>
                    </a>
                  )),
                )}
              {shown.categories.length > 0 &&
                group(
                  "Categorias",
                  shown.categories.map((category) => (
                    <a key={category.slug} {...optionProps({ id: `c-${category.slug}`, href: `/categorias/${category.slug}`, label: category.name })}>
                      <span className="flex-1 text-sm font-medium">{category.name}</span>
                      <ArrowRight size={14} className="text-black/40" aria-hidden="true" />
                    </a>
                  )),
                )}
            </div>
          )}

          {/* Todos os produtos com o termo, na listagem (mesma regra da busca). */}
          {trimmed && searched === trimmed && shown.products.length > 0 && (
            <Link
              href={`/produtos?q=${encodeURIComponent(trimmed)}`}
              onClick={close}
              className="mx-3 mt-6 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/15 px-4 py-3 text-sm font-medium transition hover:border-black"
            >
              Ver todos os resultados <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
