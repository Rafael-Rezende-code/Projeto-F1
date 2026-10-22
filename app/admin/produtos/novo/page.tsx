import { ProductFormView } from "@/components/admin/product-form";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { productOptions } from "@/lib/admin/product-options";

export default async function NovoProduto() {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  return <ProductFormView options={await productOptions(supabase)} />;
}
