import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FavoritesList } from "@/components/favorites-list";
import { MostWanted } from "@/components/most-wanted";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = { title: "Favoritos", robots: { index: false } };

export default function FavoritosPage() {
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Favoritos" }]} />
        <div className="mb-10 mt-8">
          <PageIntro eyebrow="Seus favoritos" title="Favoritos" body="As peças que você marcou com o coração ficam guardadas neste navegador." />
        </div>
        <FavoritesList empty={<MostWanted />} />
      </div>
    </div>
  );
}
