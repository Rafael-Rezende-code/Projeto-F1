import { ProductGrid } from "@/components/product-grid";
import { catalog } from "@/lib/catalog";
import { HOME_CAROUSEL_SLUGS } from "@/lib/catalog/seed/products";

// "Mais desejados": sugestões abaixo dos estados vazios (sacola e favoritos). Mesma lista do carrossel "O que o grid
// veste" da home (as peças às quais a comunidade sempre retorna), 4 primeiras. Server component: os componentes de
// cliente (CartContents, FavoritesList) recebem pronto e só mostram quando a lista está vazia.
export async function MostWanted() {
  const products = (await catalog.getProductsBySlugs(HOME_CAROUSEL_SLUGS)).slice(0, 4);
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
