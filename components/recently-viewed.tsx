"use client";

import { useEffect, useState } from "react";
import { getCardProducts } from "@/app/actions/products";
import { ProductCard } from "@/components/product-card";
import { pushRecent } from "@/lib/catalog/look";

type Item = Awaited<ReturnType<typeof getCardProducts>>[number];

// "Vistos recentemente" (refino 3, item 2.3): guarda o produto aberto no navegador (localStorage, com try/catch; sem
// armazenamento, simplesmente não aparece) e mostra até 6 vistos antes, sem o atual, com preço e estoque atuais (busca
// no servidor). Fica no fim da página: aparecer depois de carregar não empurra nada acima.
const KEY = "apex:vistos:v1";
const MAX = 6;
const SIZES = "(min-width: 1480px) 216px, (min-width: 1024px) calc((100vw - 160px) / 6), (min-width: 640px) calc((100vw - 104px) / 3), calc((100vw - 52px) / 2)";

export function RecentlyViewed({ slug }: { slug: string }) {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let previous: string[] = [];
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
      previous = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
      window.localStorage.setItem(KEY, JSON.stringify(pushRecent(previous, slug, MAX + 1)));
    } catch {
      return;
    }
    const others = previous.filter((item) => item !== slug).slice(0, MAX);
    if (!others.length) return;
    let cancelled = false;
    void getCardProducts(others).then((result) => !cancelled && setItems(result));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!items.length) return null;
  return (
    <section aria-labelledby="vistos-recentemente" className="mt-24">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Seu histórico</p>
      <h2 id="vistos-recentemente" className="mb-10 text-3xl font-medium tracking-[-0.06em] text-black sm:text-4xl">Vistos recentemente</h2>
      <ul role="list" className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-5">
        {items.map(({ product, categoryName }) => (
          <li key={product.id}>
            <ProductCard product={product} categoryName={categoryName} sizes={SIZES} />
          </li>
        ))}
      </ul>
    </section>
  );
}
