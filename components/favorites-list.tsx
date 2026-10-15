"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getFavoriteProducts } from "@/app/actions/favorites";
import { useFavorites } from "@/components/favorites";
import { ProductCard } from "@/components/product-card";
import { ProductGridSkeleton } from "@/components/skeletons";

type Item = Awaited<ReturnType<typeof getFavoriteProducts>>[number];

// Lista de /favoritos: lê os slugs salvos no navegador e busca os produtos no servidor.
export function FavoritesList() {
  const { favorites } = useFavorites();
  const [items, setItems] = useState<Item[] | null>(null);
  const key = favorites.join(",");

  useEffect(() => {
    let cancelled = false;
    void getFavoriteProducts(key ? key.split(",") : []).then((result) => !cancelled && setItems(result));
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (items === null) return <ProductGridSkeleton count={4} />;
  // Remover um favorito some na hora (sem esperar o servidor).
  const visible = items.filter((item) => favorites.includes(item.product.slug));
  if (visible.length === 0)
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-[#f5f5f3] px-6 py-16 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Garagem vazia</p>
        <h2 className="mt-3 text-2xl font-medium">Nenhum favorito no grid ainda.</h2>
        <p className="mt-3 text-sm leading-6 text-black/60">Toque no coração de uma peça para guardá-la aqui e voltar quando quiser.</p>
        <Link href="/produtos" className="mt-6 inline-flex rounded-xl bg-black px-6 py-3 text-xs font-medium text-white transition hover:bg-[#b94f01]">
          Ver a coleção
        </Link>
      </div>
    );
  return (
    <ul role="list" className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-5">
      {visible.map(({ product, categoryName }) => (
        <li key={product.id}>
          <ProductCard product={product} categoryName={categoryName} />
        </li>
      ))}
    </ul>
  );
}
