import { importTemplate } from "@/lib/admin/import";

// Modelo da planilha do importador (separador ";" e BOM, para abrir certo no Excel em português). Sem dados reais.
export function GET() {
  return new Response(importTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-importacao-produtos.csv"',
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
