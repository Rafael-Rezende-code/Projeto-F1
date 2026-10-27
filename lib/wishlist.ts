// Lista de desejos compartilhável (loja extra, item 4): partes puras (testes em wishlist.test.ts).
// Sem banco, a lista viaja no próprio link: /desejos?l=<ids compactados>&n=<nome>. Ids do catálogo no formato APX-NNN
// viram o número em base 36 ("APX-007" → "7"); outros produtos (criados no painel) vão pelo slug com "-" na frente.
// Com Supabase, há também o link curto /desejos/<token> (tabela wishlists).

export const WISHLIST_MAX = 60;
export const WISHLIST_NAME_MAX = 30;
export type WishlistRef = { code: string } | { slug: string };

export function encodeWishlist(products: { id: string; slug: string }[]) {
  return products
    .slice(0, WISHLIST_MAX)
    .map(({ id, slug }) => {
      const match = /^APX-(\d+)$/.exec(id);
      return match ? Number(match[1]).toString(36) : `-${slug}`;
    })
    .join(".");
}

export function decodeWishlist(value: string | null | undefined): WishlistRef[] {
  const seen = new Set<string>();
  const refs: WishlistRef[] = [];
  for (const token of String(value ?? "").split(".").slice(0, WISHLIST_MAX)) {
    let ref: WishlistRef | null = null;
    if (/^-[a-z0-9]+(-[a-z0-9]+)*$/.test(token) && token.length <= 101) ref = { slug: token.slice(1) };
    else if (/^[0-9a-z]{1,4}$/.test(token)) ref = { code: `APX-${String(parseInt(token, 36)).padStart(3, "0")}` };
    const key = ref ? ("code" in ref ? ref.code : ref.slug) : "";
    if (ref && !seen.has(key)) {
      seen.add(key);
      refs.push(ref);
    }
  }
  return refs;
}

/** Nome opcional do dono ("A lista de {nome}"): letras, números, espaço, hífen e apóstrofo; até 30 caracteres. */
export function cleanListName(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} '-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, WISHLIST_NAME_MAX)
    .trim();
}

export const wishlistTitle = (name: string) => (name ? `A lista de ${name}` : "Uma lista de desejos");

export function wishlistQuery(products: { id: string; slug: string }[], name: string) {
  const params = new URLSearchParams({ l: encodeWishlist(products) });
  const clean = cleanListName(name);
  if (clean) params.set("n", clean);
  return `/desejos?${params.toString()}`;
}

export const isWishlistToken = (value: string) => /^[A-Za-z0-9]{10}$/.test(value);
