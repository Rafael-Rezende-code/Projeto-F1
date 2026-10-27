import { DropFormView } from "@/components/admin/drop-form";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { catalog } from "@/lib/catalog";

export default async function NovoDrop() {
  if (adminDisabled()) return null;
  await requireAdmin();
  const products = (await catalog.getProducts()).map((product) => ({ slug: product.slug, name: product.name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return (
    <div>
      <h1 className="mb-6 text-4xl tracking-[-0.05em]">Novo drop</h1>
      <DropFormView products={products} />
    </div>
  );
}
