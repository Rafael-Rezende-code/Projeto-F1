"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import type { ImportRow } from "@/lib/admin/import";
import { analyzeImportText, executeImport, type ImportReport } from "@/lib/admin/import-run";
import { clearCatalogCache } from "@/lib/catalog/supabase-repository";

// Importador CSV (lançamento, item 3). As duas ações leem o CSV DE NOVO no servidor (não confiam na prévia do
// navegador). Fluxo: prévia (sem gravar nada) → importar. A lógica fica em lib/admin/import-run.ts (a mesma camada que o
// script scripts/supabase/ativar.ts usa); aqui só entram a sessão do administrador e o cache/revalidação da loja.
export type { ImportReport };

export type PreviewRow =
  | { line: number; ok: true; action: "novo" | "atualizar"; name: string; slug: string; priceCents: number; fulfillment: string; images: number; status: "active" | "draft"; warnings: string[] }
  | { line: number; ok: false; name: string; errors: string[] };
export type PreviewResult = { ok: true; rows: PreviewRow[]; unknownColumns: string[] } | { ok: false; message: string };

const toPreview = (row: ImportRow): PreviewRow =>
  row.ok
    ? { line: row.line, ok: true, action: row.action, name: row.product.name, slug: row.product.slug, priceCents: row.product.priceCents, fulfillment: row.product.fulfillment, images: row.product.imageUrls.length, status: row.product.status, warnings: row.warnings }
    : row;

// requireAdmin FORA do try: o redirecionamento para o login é uma exceção que o catch engoliria (achado pelo
// app/admin/autorizacao.test.ts).
export async function previewImport(text: string): Promise<PreviewResult> {
  const { supabase } = await requireAdmin();
  try {
    const analyzed = await analyzeImportText(supabase, text);
    if ("error" in analyzed) return { ok: false, message: analyzed.error! };
    return { ok: true, rows: analyzed.result.rows.map(toPreview), unknownColumns: analyzed.result.unknownColumns ?? [] };
  } catch (error) {
    return { ok: false, message: `Não foi possível ler a planilha: ${error instanceof Error ? error.message : error}` };
  }
}

export async function runImport(text: string): Promise<ImportReport> {
  const { supabase } = await requireAdmin();
  try {
    const report = await executeImport(supabase, text);
    if (report.ok) {
      clearCatalogCache();
      revalidatePath("/", "layout");
    }
    return report;
  } catch (error) {
    return { ok: false, message: `A importação falhou: ${error instanceof Error ? error.message : error}. Nada foi gravado.` };
  }
}
