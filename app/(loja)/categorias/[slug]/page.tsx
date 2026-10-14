import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageIntro } from "@/components/page-intro";
import { ProductGrid } from "@/components/product-grid";
import { catalog } from "@/lib/catalog";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const categories = await catalog.getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const category = await catalog.getCategoryBySlug((await params).slug);
  if (!category) return { title: "Categoria não encontrada" };
  const description = `${category.name}: ${category.description} Produtos de Fórmula 1 na Apex.`;
  return { title: category.name, description, alternates: { canonical: `/categorias/${category.slug}` }, openGraph: { title: category.name, description } };
}

export default async function CategoryPage({ params }: Params) {
  const category = await catalog.getCategoryBySlug((await params).slug);
  if (!category) notFound();
  const [products, categories] = await Promise.all([catalog.getProducts({ category: category.slug }), catalog.getCategories()]);

  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Produtos", href: "/produtos" }, { label: category.name }]} />
        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <PageIntro eyebrow="Categoria" title={category.name} body={category.description} />
          <nav aria-label="Outras categorias" className="flex flex-wrap gap-2">
            {categories.map((other) => (
              <Link
                key={other.slug}
                href={`/categorias/${other.slug}`}
                aria-current={other.slug === category.slug ? "page" : undefined}
                className={`rounded-xl border px-4 py-2 text-xs font-medium transition ${
                  other.slug === category.slug ? "border-black bg-black text-white" : "border-black/15 hover:border-black"
                }`}
              >
                {other.name}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-10 border-t border-black/10 pt-6 text-sm text-black/60">
          {products.length} produtos ·{" "}
          <Link href={`/produtos?categoria=${category.slug}`} className="underline underline-offset-4 hover:text-black">
            filtrar por equipe, piloto ou preço
          </Link>
        </p>
        <div className="mt-10">
          <ProductGrid products={products} priorityCount={4} />
        </div>
      </div>
    </div>
  );
}
