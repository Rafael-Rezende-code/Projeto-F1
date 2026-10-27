import type { Metadata } from "next";
import { privateRobots } from "@/lib/indexing";
import { WishlistPage } from "@/components/wishlist-page";
import { cleanListName, decodeWishlist, wishlistTitle } from "@/lib/wishlist";
import { wishlistEntries } from "@/lib/wishlist-store";

// Lista de desejos pelo link completo (/desejos?l=...&n=...), sem banco (loja extra, item 4). Fora do índice.
type Props = { searchParams: Promise<{ l?: string; n?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { n } = await searchParams;
  return { title: wishlistTitle(cleanListName(n)), robots: privateRobots };
}

export default async function DesejosPage({ searchParams }: Props) {
  const { l, n } = await searchParams;
  return <WishlistPage name={cleanListName(n)} entries={await wishlistEntries(decodeWishlist(l))} />;
}
