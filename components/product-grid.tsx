import { RevealGroup } from "@/components/motion/reveal-group";
import { ProductCard, PRODUCT_GRID_SIZES } from "@/components/product-card";
import { catalog } from "@/lib/catalog";
import type { Product } from "@/lib/catalog/types";

// Grade de produtos: 2 colunas (gap 12px) até lg; 4 colunas (gap 20px) a partir de lg. Mesmo ritmo da home.
export async function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  const categories = await catalog.getCategories();
  const nameOf = (slug: string) => categories.find((category) => category.slug === slug)?.name;
  return (
    <RevealGroup role="list" className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-5">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} categoryName={nameOf(product.categorySlug)} sizes={PRODUCT_GRID_SIZES} priority={index < priorityCount} transition />
        </li>
      ))}
    </RevealGroup>
  );
}
