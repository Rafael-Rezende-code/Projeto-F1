"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { loadCatalogPage } from "@/app/actions/catalog";
import { ProductCard, PRODUCT_GRID_SIZES } from "@/components/product-card";
import { catalogHref, type CatalogParams } from "@/lib/catalog/filters";

type Item = Awaited<ReturnType<typeof loadCatalogPage>>["items"][number];

// "Carregar mais" (refino 3, item 3.3). Sem JS é um link para ?pagina=N+1 (o servidor mostra as N+1 primeiras páginas:
// indexável e compartilhável). Com JS, busca só a página seguinte e anexa sem recarregar, troca a URL (replaceState: o
// "voltar" e o link copiado abrem a mesma lista, e o navegador restaura a posição) e leva o foco ao primeiro card novo,
// avisando a quantidade para o leitor de tela.
export function LoadMore({ current, page, total, shown }: { current: CatalogParams; page: number; total: number; shown: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [last, setLast] = useState(page);
  const [count, setCount] = useState(shown);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  // Índice do primeiro card novo: depois que ele aparece na tela, o foco vai para o link dele.
  const focusIndex = useRef<number | null>(null);
  useEffect(() => {
    if (focusIndex.current === null) return;
    document.getElementById("catalogo-mais")?.querySelectorAll<HTMLElement>(":scope > li")[focusIndex.current]?.querySelector<HTMLAnchorElement>("h3 a")?.focus();
    focusIndex.current = null;
  }, [items]);
  const hasMore = count < total;
  const next = last + 1;
  const href = catalogHref(current, { pagina: String(next) });

  const load = (event: React.MouseEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const params = Object.fromEntries(new URL(href, window.location.origin).searchParams);
      const result = await loadCatalogPage(params, next);
      const before = items.length;
      setItems((previous) => [...previous, ...result.items]);
      setLast(result.page);
      setCount((value) => value + result.items.length);
      setMessage(`${result.items.length} produtos carregados.`);
      focusIndex.current = before;
      window.history.replaceState(window.history.state, "", href);
    });
  };

  return (
    <>
      {items.length > 0 && (
        <ul id="catalogo-mais" role="list" className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-3 lg:gap-x-5 xl:grid-cols-4">
          {items.map(({ product, categoryName }) => (
            <li key={product.id} className="chip-in">
              <ProductCard product={product} categoryName={categoryName} sizes={PRODUCT_GRID_SIZES} />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-12 flex flex-col items-center gap-3">
        <p className="text-sm text-black/60">
          Mostrando {count} de {total}
        </p>
        {hasMore && (
          <Link href={href} scroll={false} onClick={load} aria-disabled={pending} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-black px-8 text-sm font-medium text-black transition hover:bg-black hover:text-white aria-disabled:opacity-60">
            {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Carregar mais
          </Link>
        )}
        <p role="status" aria-live="polite" className="sr-only">{message}</p>
      </div>
    </>
  );
}
