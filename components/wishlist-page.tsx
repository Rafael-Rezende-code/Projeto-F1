import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { WishlistGrid } from "@/components/wishlist-grid";
import { wishlistTitle } from "@/lib/wishlist";
import type { WishlistEntry } from "@/lib/wishlist-store";

// Página pública da lista de desejos (loja extra, item 4): título com o nome opcional, peças e "Criar a minha lista".
export function WishlistPage({ name, entries }: { name: string; entries: WishlistEntry[] }) {
  const count = entries.filter((entry) => entry.product).length;
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <PageIntro
            eyebrow="Lista de desejos"
            title={wishlistTitle(name)}
            body={count ? `${count} ${count === 1 ? "peça escolhida" : "peças escolhidas"} a dedo. Quer dar um presente? Coloque na sacola.` : "Esta lista está vazia."}
          />
          <Link href="/favoritos" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-black px-6 text-sm font-medium text-white transition hover:bg-[#b94f01]">
            Criar a minha lista
          </Link>
        </div>
        {entries.length ? <WishlistGrid entries={entries} /> : (
          <p className="rounded-2xl bg-[#f5f5f3] px-6 py-16 text-center text-sm text-black/60">
            Nenhuma peça nesta lista. <Link href="/produtos" className="underline underline-offset-4">Ver a coleção</Link>
          </p>
        )}
      </div>
    </div>
  );
}
