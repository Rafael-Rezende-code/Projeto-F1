"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { analyzeImport, type ImportContext, type ImportRow } from "@/lib/admin/import";
import { importImage, mapLimit, type StoredImage } from "@/lib/admin/import-images";
import { clearCatalogCache } from "@/lib/catalog/supabase-repository";

// Importador CSV (lançamento, item 3). As duas ações leem o CSV DE NOVO no servidor (não confiam na prévia do
// navegador). Fluxo: prévia (sem gravar nada) → importar: baixa e guarda as fotos, depois grava TODOS os produtos
// válidos numa transação só (função import_products). Linhas com erro ficam de fora e aparecem no relatório.
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 500;

async function loadContext(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"]): Promise<ImportContext> {
  const [categories, teams, drivers, products] = await Promise.all([
    supabase.from("categories").select("slug, name"),
    supabase.from("teams").select("slug, name"),
    supabase.from("drivers").select("slug, name, team_slug"),
    supabase.from("products").select("id, slug, product_variants(sku, size)").limit(5000),
  ]);
  const error = categories.error ?? teams.error ?? drivers.error ?? products.error;
  if (error) throw new Error(error.message);
  const rows = (products.data ?? []) as { id: string; slug: string; product_variants: { sku: string; size: string }[] }[];
  return {
    categories: categories.data ?? [],
    teams: teams.data ?? [],
    drivers: drivers.data ?? [],
    existing: new Map(rows.map((row) => [row.slug, { id: row.id, variants: row.product_variants ?? [] }])),
    skuOwners: new Map(rows.flatMap((row) => (row.product_variants ?? []).map((variant) => [variant.sku, row.slug] as const))),
  };
}

export type PreviewRow =
  | { line: number; ok: true; action: "novo" | "atualizar"; name: string; slug: string; priceCents: number; fulfillment: string; images: number; status: "active" | "draft"; warnings: string[] }
  | { line: number; ok: false; name: string; errors: string[] };
export type PreviewResult = { ok: true; rows: PreviewRow[]; unknownColumns: string[] } | { ok: false; message: string };

const toPreview = (row: ImportRow): PreviewRow =>
  row.ok
    ? { line: row.line, ok: true, action: row.action, name: row.product.name, slug: row.product.slug, priceCents: row.product.priceCents, fulfillment: row.product.fulfillment, images: row.product.imageUrls.length, status: row.product.status, warnings: row.warnings }
    : row;

async function analyze(text: string) {
  if (typeof text !== "string" || !text.trim()) return { error: "Arquivo vazio." } as const;
  if (text.length > MAX_BYTES) return { error: "Arquivo grande demais (máximo 2 MB). Divida em partes." } as const;
  const { supabase } = await requireAdmin();
  const result = analyzeImport(text, await loadContext(supabase));
  if (result.headerErrors.length) return { error: result.headerErrors.join(" ") } as const;
  if (result.rows.length > MAX_ROWS) return { error: `São ${result.rows.length} linhas; o máximo por importação é ${MAX_ROWS}. Divida em partes.` } as const;
  return { supabase, result } as const;
}

export async function previewImport(text: string): Promise<PreviewResult> {
  try {
    const analyzed = await analyze(text);
    if ("error" in analyzed) return { ok: false, message: analyzed.error! };
    return { ok: true, rows: analyzed.result.rows.map(toPreview), unknownColumns: analyzed.result.unknownColumns ?? [] };
  } catch (error) {
    return { ok: false, message: `Não foi possível ler a planilha: ${error instanceof Error ? error.message : error}` };
  }
}

export type ImportReport =
  | {
      ok: true;
      created: string[];
      updated: string[];
      /** Produtos gravados como rascunho porque alguma foto falhou. */
      imageProblems: { slug: string; name: string; errors: string[] }[];
      skipped: { line: number; name: string; errors: string[] }[];
    }
  | { ok: false; message: string };

export async function runImport(text: string): Promise<ImportReport> {
  try {
    const analyzed = await analyze(text);
    if ("error" in analyzed) return { ok: false, message: analyzed.error! };
    const { supabase, result } = analyzed;
    const valid = result.rows.filter((row): row is Extract<ImportRow, { ok: true }> => row.ok);
    const skipped = result.rows.filter((row): row is Extract<ImportRow, { ok: false }> => !row.ok).map(({ line, name, errors }) => ({ line, name, errors }));
    if (!valid.length) return { ok: false, message: "Nenhuma linha válida para importar. Corrija os erros e tente de novo." };

    // 1) Fotos (2 produtos × 4 fotos ao mesmo tempo). Falhou alguma → o produto entra como RASCUNHO, com o aviso.
    const imageProblems: { slug: string; name: string; errors: string[] }[] = [];
    const images = await mapLimit(valid, 2, async (row) => {
      if (!row.product.imageUrls.length) return null;
      const errors: string[] = [];
      const stored = await mapLimit(row.product.imageUrls, 4, async (url) => {
        try {
          return await importImage(supabase, row.product.slug, url, row.product.name);
        } catch (error) {
          errors.push(`${url.slice(0, 80)}: ${error instanceof Error ? error.message : "falhou"}`);
          return null;
        }
      });
      if (errors.length) imageProblems.push({ slug: row.product.slug, name: row.product.name, errors });
      return stored.filter((image): image is StoredImage => Boolean(image));
    });

    // 2) Produtos numa transação só.
    const items = valid.map(({ product, secret }, index) => {
      const failed = imageProblems.some((problem) => problem.slug === product.slug);
      const stored = images[index];
      return {
        slug: product.slug,
        name: product.name,
        description: product.description,
        category_slug: product.categorySlug,
        team_slug: product.teamSlug ?? "",
        driver_slug: product.driverSlug ?? "",
        price_cents: product.priceCents,
        compare_at_price_cents: product.compareAtPriceCents,
        tags: product.tags,
        status: failed ? "draft" : product.status,
        fulfillment: product.fulfillment,
        dispatch_min_days: product.dispatchMin,
        dispatch_max_days: product.dispatchMax,
        origin: product.origin,
        weight_grams: product.weightGrams,
        length_cm: product.lengthCm,
        width_cm: product.widthCm,
        height_cm: product.heightCm,
        variants: product.variants,
        // Sem coluna de imagens (ou todas falharam): mantém as fotos atuais do produto.
        images: stored && stored.length ? stored : null,
        private: Object.fromEntries(
          Object.entries({ cost_cents: secret.costCents, supplier_shipping_cents: secret.supplierShippingCents, supplier_url: secret.supplierUrl, notes: secret.notes }).filter(([, value]) => value !== undefined),
        ),
      };
    });
    const { data, error } = await supabase.rpc("import_products", { p_items: items });
    if (error) {
      const detail = error.details ? ` (${error.details})` : "";
      const message = error.message.includes("SKU_DE_OUTRO_PRODUTO")
        ? `Um SKU já pertence a outro produto${detail}. Nada foi gravado.`
        : error.message.includes("SEM_PERMISSAO") || error.message.includes("row-level security")
          ? "Sem permissão: este e-mail não está em admin_emails no banco. Nada foi gravado."
          : `O banco recusou a importação: ${error.message}${detail}. Nada foi gravado.`;
      return { ok: false, message };
    }
    const saved = (data ?? []) as { slug: string; action: "criado" | "atualizado" }[];
    clearCatalogCache();
    revalidatePath("/", "layout");
    return {
      ok: true,
      created: saved.filter((row) => row.action === "criado").map((row) => row.slug),
      updated: saved.filter((row) => row.action === "atualizado").map((row) => row.slug),
      imageProblems,
      skipped,
    };
  } catch (error) {
    return { ok: false, message: `A importação falhou: ${error instanceof Error ? error.message : error}. Nada foi gravado.` };
  }
}
