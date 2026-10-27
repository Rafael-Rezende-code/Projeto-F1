import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { privateRobots } from "@/lib/indexing";
import { WishlistPage } from "@/components/wishlist-page";
import { isOrderStoreConfigured } from "@/lib/supabase/config";
import { isWishlistToken, wishlistTitle } from "@/lib/wishlist";
import { readShortList, wishlistEntries } from "@/lib/wishlist-store";

// Lista de desejos pelo link curto (/desejos/<token>, Supabase). Fora do índice; mostra sempre a versão mais recente.
type Props = { params: Promise<{ token: string }> };
export const dynamic = "force-dynamic";

async function load(token: string) {
  if (!isOrderStoreConfigured() || !isWishlistToken(token)) return null;
  return readShortList(token);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const list = await load((await params).token);
  return { title: list ? wishlistTitle(list.name) : "Lista não encontrada", robots: privateRobots };
}

export default async function ListaCurta({ params }: Props) {
  const list = await load((await params).token);
  if (!list) notFound();
  return <WishlistPage name={list.name} entries={await wishlistEntries(list.slugs.map((slug) => ({ slug })))} />;
}
