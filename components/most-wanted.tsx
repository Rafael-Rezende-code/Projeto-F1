import { ProductGrid } from "@/components/product-grid";
import { catalog } from "@/lib/catalog";

// "Mais desejados": sugestões abaixo dos estados vazios (sacola e favoritos): as 4 primeiras de "Mais vendidos" (curadoria
// + vendas reais; lib/catalog/curation.ts). Server component: os componentes de
// cliente (CartContents, FavoritesList) recebem pronto e só mostram quando a lista está vazia.
export async function MostWanted() {
  const products = await catalog.getBestsellers(4);
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="mais-desejados" className="mt-16 sm:mt-20">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Para começar</p>
      <h2 id="mais-desejados" className="mb-8 text-3xl font-medium tracking-[-0.06em] sm:text-4xl">
        Mais desejados
      </h2>
      <ProductGrid products={products} />
    </section>
  );
}
