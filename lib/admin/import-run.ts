import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeImport, type ImportContext, type ImportRow } from "./import";
import { importImage, mapLimit, type StoredImage } from "./import-images";

// Camada de código do importador de produtos, SEM Next nem sessão: recebe um cliente Supabase (com a sessão de um
// administrador, porque a função import_products confere is_admin()) e o texto do CSV. É o que a ação do painel
// (app/admin/produtos/importar/actions.ts) e o script de teste (scripts/supabase/ativar.ts) usam, para os dois
// passarem exatamente pelo mesmo caminho: ler o CSV, validar, guardar as fotos e gravar tudo numa transação.
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 500;

export async function loadImportContext(supabase: SupabaseClient): Promise<ImportContext> {
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

/** Lê e valida o CSV contra o banco (nada é gravado). */
export async function analyzeImportText(supabase: SupabaseClient, text: string) {
  if (typeof text !== "string" || !text.trim()) return { error: "Arquivo vazio." } as const;
  if (text.length > IMPORT_MAX_BYTES) return { error: "Arquivo grande demais (máximo 2 MB). Divida em partes." } as const;
  const result = analyzeImport(text, await loadImportContext(supabase));
  if (result.headerErrors.length) return { error: result.headerErrors.join(" ") } as const;
  if (result.rows.length > IMPORT_MAX_ROWS) return { error: `São ${result.rows.length} linhas; o máximo por importação é ${IMPORT_MAX_ROWS}. Divida em partes.` } as const;
  return { result } as const;
}

export type ImportReport =
  | {
      ok: true;
      created: string[];
      updated: string[];
      /** Produtos gravados como rascunho porque alguma foto falhou. */
      imageProblems: { slug: string; name: string; errors: string[] }[];
      skipped: { line: number; name: string; errors: string[] }[];
      /** Caminhos das fotos enviadas ao Storage (para quem precisar limpar depois, como o script de teste). */
      storagePaths: string[];
    }
  | { ok: false; message: string };

/**
 * Importa o CSV: fotos primeiro (falhou alguma → o produto entra como RASCUNHO), depois todos os produtos válidos numa
 * transação só (import_products). Linhas com erro ficam de fora e aparecem em `skipped`.
 */
export async function executeImport(supabase: SupabaseClient, text: string): Promise<ImportReport> {
  try {
    const analyzed = await analyzeImportText(supabase, text);
    if ("error" in analyzed) return { ok: false, message: analyzed.error! };
    const { result } = analyzed;
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
        // Curadoria (refino 3): só vai o que a planilha preencheu (campo ausente = o banco mantém o valor atual).
        ...Object.fromEntries(
          Object.entries({
            featured: product.curation.featured,
            bestseller_manual: product.curation.bestsellerManual,
            bestseller_rank: product.curation.bestsellerRank,
            new_until: product.curation.newUntil,
            // Personalização (loja extra, item 3): idem.
            personalizable: product.personalization.personalizable,
            personalization_fee_cents: product.personalization.feeCents,
            personalization_max_name: product.personalization.maxName,
            personalization_number_min: product.personalization.numberMin,
            personalization_number_max: product.personalization.numberMax,
          }).filter(([, value]) => value !== undefined),
        ),
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
    return {
      ok: true,
      created: saved.filter((row) => row.action === "criado").map((row) => row.slug),
      updated: saved.filter((row) => row.action === "atualizado").map((row) => row.slug),
      imageProblems,
      skipped,
      storagePaths: images.flatMap((list) => (list ?? []).map((image) => image.storage_path)),
    };
  } catch (error) {
    return { ok: false, message: `A importação falhou: ${error instanceof Error ? error.message : error}. Nada foi gravado.` };
  }
}
