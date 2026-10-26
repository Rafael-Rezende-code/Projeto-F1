import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EditorialHeader } from "@/components/editorial-header";
import { ProductGrid } from "@/components/product-grid";
import { catalog } from "@/lib/catalog";
import { giftBandCounts, giftProducts, parseGiftBand } from "@/lib/catalog/gifts";
import { IMG } from "@/lib/catalog/seed/images";

export const metadata: Metadata = {
  title: "Presentes",
  description: "Guia de presentes de Fórmula 1 por faixa de preço: até R$ 100, até R$ 200, até R$ 300 e acima.",
  alternates: { canonical: "/presentes" },
};

// Guia de presentes (refino 3, item 1.5): chips por faixa de preço (links: funcionam sem JS e ficam na URL, ?faixa=),
// contagem pelos preços reais e a mesma grade do catálogo, do mais barato ao mais caro.
export default async function GiftsPage({ searchParams }: { searchParams: Promise<{ faixa?: string | string[] }> }) {
  const band = parseGiftBand((await searchParams).faixa);
  const all = await catalog.getProducts();
  const bands = giftBandCounts(all);
  const products = giftProducts(all, band);
  const chip = "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm transition";

  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Presentes" }]} />
        <div className="mt-8">
          <EditorialHeader
            eyebrow="Guia de presentes"
            title="Presentes"
            phrase="Para quem vive a próxima volta."
            intro="Escolha pela faixa de preço: camisetas, bonés, pôsteres e peças de coleção para quem acompanha cada largada."
            image={{ src: IMG.collectibles, alt: "Peças colecionáveis de automobilismo" }}
          />
        </div>

        <nav aria-label="Faixas de preço" className="mt-12 border-y border-black/10 py-5">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link href="/presentes" scroll={false} aria-current={!band ? "page" : undefined} className={`${chip} ${!band ? "border-black bg-black text-white" : "border-black/15 hover:border-black"}`}>
                Todos <span className={!band ? "text-white/70" : "text-black/60"}>{all.length}</span>
              </Link>
            </li>
            {bands.map((item) => {
              const active = band === item.value;
              return (
                <li key={item.value}>
                  {item.count === 0 ? (
                    <span aria-disabled="true" className={`${chip} cursor-not-allowed border-black/10 text-black/40`}>
                      {item.label} <span>0</span>
                    </span>
                  ) : (
                    <Link href={`/presentes?faixa=${item.value}`} scroll={false} aria-current={active ? "page" : undefined} className={`${chip} ${active ? "border-black bg-black text-white" : "border-black/15 hover:border-black"}`}>
                      {item.label} <span className={active ? "text-white/70" : "text-black/60"}>{item.count}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          <p aria-live="polite" className="mt-4 text-sm text-black/60">
            {products.length === 1 ? "1 presente" : `${products.length} presentes`}, do menor para o maior preço.
          </p>
        </nav>

        <div className="mt-10">
          <ProductGrid products={products} priorityCount={4} />
        </div>
      </div>
    </div>
  );
}
