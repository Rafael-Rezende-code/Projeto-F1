"use client";

import { useEffect, useMemo, useState } from "react";
import { activeKits } from "@/app/(loja)/checkout/actions";
import type { Kit } from "@/lib/kits";
import { applyKits, type PriceLine } from "@/lib/pricing";
import type { CartItem } from "@/lib/cart/reducer";

// Kits ativos para a PRÉVIA da sacola e do checkout (loja extra, item 2). Uma busca por visita (só com 2+ itens na
// sacola); o desconto que vale é o do servidor. Sem resposta, nada de kit aparece.
let pending: Promise<Kit[]> | null = null;

export const cartPriceLines = (items: CartItem[]): PriceLine[] =>
  items.map((item) => ({ key: item.key, sku: item.sku, slug: item.slug, unitPriceCents: item.priceCents, feeCents: item.feeCents ?? 0, quantity: item.quantity, personalized: Boolean(item.personalization) }));

export function useCartKits(items: CartItem[]) {
  const [kits, setKits] = useState<Kit[]>([]);
  const wanted = items.length >= 2;
  useEffect(() => {
    if (!wanted) return;
    let alive = true;
    pending ??= activeKits().catch(() => {
      pending = null;
      return [];
    });
    pending.then((list) => alive && setKits(list));
    return () => {
      alive = false;
    };
  }, [wanted]);
  return useMemo(() => {
    const applied = wanted ? applyKits(cartPriceLines(items), kits) : [];
    return { applied, kitDiscountCents: applied.reduce((sum, kit) => sum + kit.discountCents, 0) };
  }, [items, kits, wanted]);
}
