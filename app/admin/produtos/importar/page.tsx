import Link from "next/link";
import { ImportView } from "@/components/admin/import-view";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { IMPORT_COLUMNS } from "@/lib/admin/import";

// Importar produtos por CSV (lançamento, item 3). As server actions desta página baixam fotos: até 5 minutos.
export const maxDuration = 300;

export default async function ImportarProdutos() {
  if (adminDisabled()) return null;
  await requireAdmin();
  return (
    <div>
      <Link href="/admin/produtos" className="text-sm text-black/60 hover:underline">← Produtos</Link>
      <h1 className="mt-3 text-4xl tracking-[-0.05em]">Importar produtos</h1>
      <p className="mt-2 max-w-[75ch] text-sm leading-6 text-black/60">
        Envie uma planilha CSV. Primeiro você vê a prévia (novos, atualizados e linhas com erro); nada é gravado até
        confirmar. Produto com slug que já existe é <strong className="font-medium text-black">atualizado</strong>. Custo,
        frete do fornecedor, link e notas vão para a área privada (nunca aparecem na loja).
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="/admin/produtos/importar/modelo" download className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-medium hover:border-black">Baixar o modelo (CSV)</a>
      </div>
      <ImportView />
      <details className="mt-10 rounded-2xl bg-white p-6 text-sm">
        <summary className="cursor-pointer font-medium">Colunas da planilha</summary>
        <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-[180px_minmax(0,1fr)]">
          {IMPORT_COLUMNS.map((column) => (
            <div key={column.key} className="contents">
              <dt className="font-mono text-xs">{column.key}{column.required ? " *" : ""}</dt>
              <dd className="text-black/70">{column.help}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-black/60">* obrigatória. Separador ; ou , (detectado). Preços como &quot;R$ 1.299,90&quot; ou 1299,90. Célula vazia de custo, frete, link ou notas não apaga o que já existe. Até 500 linhas e 2 MB por arquivo.</p>
      </details>
    </div>
  );
}
