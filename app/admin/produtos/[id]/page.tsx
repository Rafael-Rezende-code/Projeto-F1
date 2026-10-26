import { notFound } from "next/navigation";
import { ProductFormView } from "@/components/admin/product-form";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { productOptions } from "@/lib/admin/product-options";
import type { ProductForm } from "@/lib/admin/product-schema";
import { DEFAULT_DISPATCH, DEFAULT_PACKAGE } from "@/lib/catalog/fulfillment";
import type { ProductRow } from "@/lib/catalog/supabase-mapping";

const reais = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2).replace(".", ","));

export default async function EditarProduto({ params }: { params: Promise<{ id: string }> }) {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await supabase.from("products").select("*, product_variants(*), product_images(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const row = data as ProductRow;
  const { data: secret } = await supabase.from("product_private").select("*").eq("product_id", id).maybeSingle();
  const initial: ProductForm = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    details: row.details ?? [],
    detailsPending: row.details_pending,
    price: reais(row.price_cents),
    compareAtPrice: reais(row.compare_at_price_cents),
    categorySlug: row.category_slug,
    teamSlug: row.team_slug ?? "",
    driverSlug: row.driver_slug ?? "",
    tags: row.tags.join(", "),
    isNew: row.is_new,
    featured: row.featured,
    bestsellerManual: row.bestseller_manual ?? false,
    bestsellerRank: row.bestseller_rank ? String(row.bestseller_rank) : "",
    newUntil: row.new_until ? row.new_until.slice(0, 10) : "",
    status: row.status,
    variants: [...(row.product_variants ?? [])].sort((a, b) => a.position - b.position).map((v) => ({ sku: v.sku, size: v.size, color: v.color ?? "", stock: v.stock })),
    images: [...(row.product_images ?? [])].sort((a, b) => a.position - b.position).map((i) => ({ src: i.src, alt: i.alt, storagePath: i.storage_path ?? null })),
    fulfillment: row.fulfillment ?? "estoque_proprio",
    dispatchMin: row.dispatch_min_days ?? DEFAULT_DISPATCH.min,
    dispatchMax: row.dispatch_max_days ?? DEFAULT_DISPATCH.max,
    origin: row.origin ?? "nacional",
    weightGrams: row.weight_grams ?? DEFAULT_PACKAGE.weightGrams,
    lengthCm: Number(row.length_cm ?? DEFAULT_PACKAGE.lengthCm),
    widthCm: Number(row.width_cm ?? DEFAULT_PACKAGE.widthCm),
    heightCm: Number(row.height_cm ?? DEFAULT_PACKAGE.heightCm),
    cost: reais(secret?.cost_cents ?? null),
    supplierShipping: reais(secret?.supplier_shipping_cents ?? null),
    supplierUrl: secret?.supplier_url ?? "",
    notes: secret?.notes ?? "",
  };
  return <ProductFormView options={await productOptions(supabase)} initial={initial} code={row.code} />;
}
