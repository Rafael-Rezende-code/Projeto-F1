import { catalog } from "@/lib/catalog";
import { kitFor, kitPrice } from "@/lib/kits";
import { getKits } from "@/lib/kits-store";
import { KitBuilder } from "@/components/kit-builder";

// "Kit dia de corrida" (loja extra, item 2) nas páginas de piloto e equipe: 3 peças sugeridas, tamanho de cada uma,
// preço somado e preço do kit. Sem kit ativo (ou com peça fora do catálogo), a seção não aparece.
export async function KitSection({ driverSlug, teamSlug, className = "" }: { driverSlug?: string; teamSlug?: string; className?: string }) {
  const kit = kitFor(await getKits(), { driverSlug, teamSlug });
  if (!kit) return null;
  const products = await catalog.getProductsBySlugs(kit.productSlugs);
  const ordered = kit.productSlugs.map((slug) => products.find((product) => product.slug === slug)).filter((product) => product !== undefined);
  if (ordered.length !== kit.productSlugs.length) return null;
  const price = kitPrice(ordered.map((product) => product.priceCents), kit.percent);
  return (
    <section aria-labelledby={`kit-${kit.slug}`} className={className}>
      <KitBuilder kit={{ slug: kit.slug, title: kit.title, percent: kit.percent }} products={ordered} price={price} />
    </section>
  );
}
