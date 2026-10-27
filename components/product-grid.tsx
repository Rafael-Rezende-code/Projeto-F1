import { RevealGroup } from "@/components/motion/reveal-group";
import { ProductCard, PRODUCT_GRID_SIZES } from "@/components/product-card";
import { catalog } from "@/lib/catalog";
import type { Product } from "@/lib/catalog/types";

// Larguras reais do card na grade "colecao" (2 colunas; 3 a partir de 1024px; 4 a partir de 1280px).
const COLLECTION_SIZES =
  "(min-width: 1480px) 335px, (min-width: 1280px) calc((100vw - 140px) / 4), (min-width: 1024px) calc((100vw - 120px) / 3), (min-width: 640px) calc((100vw - 92px) / 2), calc((100vw - 52px) / 2)";

// Grade de produtos: 2 colunas (gap 12px) até lg; 4 colunas (gap 20px) a partir de lg. Mesmo ritmo da home.
// `layout="colecao"` (páginas de piloto, refino 2): 2 colunas no celular, 3 a partir de 1024px e 4 a partir de 1280px.
// O primeiro produto ocupa 2×2 só quando isso fecha as linhas sem buraco (4 + (n − 1) células múltiplo do nº de
// colunas); com os 4 produtos de cada piloto do seed, isso não acontece e a grade fica uniforme.
// `layout="catalogo"` (catálogo com barra lateral, refino 3): as mesmas colunas da "colecao", sem o destaque 2×2.
export async function ProductGrid({ products, priorityCount = 0, layout = "default" }: { products: Product[]; priorityCount?: number; layout?: "default" | "colecao" | "catalogo" }) {
  const categories = await catalog.getCategories();
  const nameOf = (slug: string) => categories.find((category) => category.slug === slug)?.name;
  const collection = layout === "colecao" || layout === "catalogo";
  const cells = products.length + 3;
  const feature = layout === "colecao" ? `${cells % 3 === 0 ? "lg:col-span-2 lg:row-span-2" : ""} ${cells % 4 === 0 ? "xl:col-span-2 xl:row-span-2" : "xl:col-span-1 xl:row-span-1"}` : "";
  return (
    <RevealGroup role="list" className={`grid grid-cols-2 gap-x-3 gap-y-10 lg:gap-x-5 ${collection ? "lg:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-4"}`}>
      {products.map((product, index) => (
        <li key={product.id} className={index === 0 && products.length > 1 ? feature : undefined}>
          <ProductCard product={product} categoryName={nameOf(product.categorySlug)} sizes={collection ? COLLECTION_SIZES : PRODUCT_GRID_SIZES} priority={index < priorityCount} transition />
        </li>
      ))}
    </RevealGroup>
  );
}
