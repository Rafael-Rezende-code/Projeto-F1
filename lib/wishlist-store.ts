import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { catalog } from "@/lib/catalog";
import type { Product } from "@/lib/catalog/types";
import { createServiceClient } from "@/lib/supabase/server";
import { cleanListName, WISHLIST_MAX, type WishlistRef } from "@/lib/wishlist";

// Lista de desejos (loja extra, item 4), lado do servidor: produtos de uma lista e o link curto no Supabase.
export type WishlistEntry = { key: string; product: Product | null; categoryName?: string };

/** Produtos na ordem da lista. Peça que não existe mais vira uma entrada sem produto ("indisponível"). */
export async function wishlistEntries(refs: WishlistRef[]): Promise<WishlistEntry[]> {
  const [all, categories] = await Promise.all([catalog.getProducts(), catalog.getCategories()]);
  return refs.slice(0, WISHLIST_MAX).map((ref) => {
    const product = "code" in ref ? all.find((item) => item.id === ref.code) : all.find((item) => item.slug === ref.slug);
    return { key: "code" in ref ? ref.code : ref.slug, product: product ?? null, categoryName: product ? categories.find((c) => c.slug === product.categorySlug)?.name : undefined };
  });
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const newToken = () => Array.from(randomBytes(10), (byte) => ALPHABET[byte % ALPHABET.length]).join("");
const hash = (secret: string) => createHash("sha256").update(`apex-lista:${secret}`).digest("hex");

/** Cria (sem token) ou atualiza (token + chave de edição) a lista curta. A chave só volta na criação. */
export async function saveShortList(input: { slugs: string[]; name: string; token?: string; secret?: string }) {
  const db = createServiceClient();
  const row = { name: cleanListName(input.name), product_slugs: input.slugs.slice(0, WISHLIST_MAX) };
  if (input.token && input.secret) {
    const { data } = await db.from("wishlists").select("secret_hash").eq("token", input.token).maybeSingle();
    const expected = Buffer.from((data?.secret_hash as string | undefined) ?? "", "hex");
    const given = Buffer.from(hash(input.secret), "hex");
    if (expected.length === given.length && timingSafeEqual(expected, given)) {
      const { error } = await db.from("wishlists").update(row).eq("token", input.token);
      if (!error) return { ok: true as const, token: input.token };
    }
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = newToken();
    const secret = randomBytes(18).toString("base64url");
    const { error } = await db.from("wishlists").insert({ ...row, token, secret_hash: hash(secret) });
    if (!error) return { ok: true as const, token, secret };
    if (error.code !== "23505") return { ok: false as const, error: error.code ?? "erro" };
  }
  return { ok: false as const, error: "token" };
}

export async function readShortList(token: string) {
  const { data } = await createServiceClient().from("wishlists").select("name, product_slugs").eq("token", token).maybeSingle();
  return data ? { name: (data.name as string) ?? "", slugs: (data.product_slugs as string[]) ?? [] } : null;
}
