"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { productFormSchema, toCents, type ProductForm } from "@/lib/admin/product-schema";
import { clearCatalogCache } from "@/lib/catalog/supabase-repository";
import { fieldErrors } from "@/lib/checkout/schema";

export type SaveResult = { ok: true; id: string } | { ok: false; message: string; errors?: Record<string, string> };

// Salvar produto (criar/editar) pelo painel. Roda com a sessão do administrador: o RLS do banco confere de novo
// (is_admin). Depois de salvar, as páginas da loja são revalidadas e o cache do catálogo é limpo.
export async function saveProduct(input: ProductForm): Promise<SaveResult> {
  const { supabase } = await requireAdmin();
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira os campos destacados.", errors: fieldErrors(parsed.error) };
  const form = parsed.data;

  // SKU é global: não pode pertencer a outro produto.
  const skus = form.variants.map((variant) => variant.sku);
  const { data: taken } = await supabase.from("product_variants").select("sku, product_id").in("sku", skus);
  const conflict = (taken ?? []).find((row) => row.product_id !== form.id);
  if (conflict) return { ok: false, message: `O SKU ${conflict.sku} já é de outro produto.`, errors: { variants: `SKU ${conflict.sku} em uso.` } };

  const row = {
    name: form.name,
    slug: form.slug,
    description: form.description,
    details: form.details,
    details_pending: form.detailsPending,
    price_cents: toCents(form.price)!,
    compare_at_price_cents: toCents(form.compareAtPrice),
    category_slug: form.categorySlug,
    team_slug: form.teamSlug || null,
    driver_slug: form.driverSlug || null,
    tags: form.tags.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    is_new: form.isNew,
    featured: form.featured,
    status: form.status,
  };

  let id = form.id;
  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return { ok: false, message: friendly(error.message) };
  } else {
    const { data, error } = await supabase.from("products").insert({ ...row, illustrative: false, position: 1000 }).select("id").single();
    if (error || !data) return { ok: false, message: friendly(error?.message ?? "") };
    id = data.id as string;
  }

  // Variantes: grava as da lista e remove as que saíram (pedidos antigos guardam o SKU em texto).
  const { error: variantError } = await supabase
    .from("product_variants")
    .upsert(form.variants.map((variant, position) => ({ sku: variant.sku, product_id: id, size: variant.size, color: variant.color || null, stock: variant.stock, position })), { onConflict: "sku" });
  if (variantError) return { ok: false, message: friendly(variantError.message) };
  await supabase.from("product_variants").delete().eq("product_id", id).not("sku", "in", `(${skus.map((sku) => `"${sku}"`).join(",")})`);

  // Imagens: regrava na ordem do formulário (os arquivos do Storage ficam; só a lista muda).
  await supabase.from("product_images").delete().eq("product_id", id);
  if (form.images.length) {
    const { error } = await supabase
      .from("product_images")
      .insert(form.images.map((image, position) => ({ product_id: id, src: image.src, alt: image.alt || form.name, storage_path: image.storagePath, illustrative: false, position })));
    if (error) return { ok: false, message: friendly(error.message) };
  }

  refreshStore();
  return { ok: true, id: id! };
}

export async function setProductStatus(id: string, status: "draft" | "active" | "archived") {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("products").update({ status }).eq("id", id);
  if (error) return { ok: false as const, message: friendly(error.message) };
  refreshStore();
  return { ok: true as const };
}

function refreshStore() {
  clearCatalogCache();
  revalidatePath("/", "layout");
}

function friendly(message: string) {
  if (message.includes("products_slug_key")) return "Já existe um produto com este endereço (slug).";
  if (message.includes("row-level security")) return "Sem permissão: este e-mail não está em admin_emails no banco.";
  return `Não foi possível salvar: ${message}`;
}
