"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Upload } from "lucide-react";
import { previewImport, runImport, type ImportReport, type PreviewResult } from "@/app/admin/produtos/importar/actions";
import { formatPrice } from "@/lib/format";

/** Excel em português salva "CSV" em Windows-1252: lê como UTF-8 e, se não for, como Windows-1252 (acentos certos). */
async function readText(file: File) {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

// Importador (lançamento, item 3): arquivo → prévia → importar → relatório. A prévia e a importação são feitas no
// servidor (app/admin/produtos/importar/actions.ts), que lê o arquivo de novo.
export function ImportView() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [pending, start] = useTransition();
  const [phase, setPhase] = useState<"preview" | "import" | null>(null);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    const content = await readText(file);
    setText(content);
    setFileName(file.name);
    setReport(null);
    setPhase("preview");
    start(async () => setPreview(await previewImport(content)));
  };

  const confirm = () => {
    setPhase("import");
    start(async () => setReport(await runImport(text)));
  };

  const rows = preview?.ok ? preview.rows : [];
  const created = rows.filter((row) => row.ok && row.action === "novo").length;
  const updated = rows.filter((row) => row.ok && row.action === "atualizar").length;
  const failed = rows.filter((row) => !row.ok).length;

  return (
    <div className="mt-6 space-y-6">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center text-sm hover:border-black has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black">
        <Upload size={20} aria-hidden="true" />
        <span className="font-medium">{fileName || "Escolher planilha CSV"}</span>
        <span className="text-xs text-black/60">A prévia aparece em seguida; nada é gravado ainda.</span>
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => choose(event.target.files?.[0])} />
      </label>

      {pending && (
        <p role="status" className="flex items-center gap-2 text-sm text-black/70">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          {phase === "import" ? "Importando: baixando as fotos e gravando os produtos…" : "Lendo a planilha…"}
        </p>
      )}

      {preview && !preview.ok && <p role="alert" className="rounded-xl bg-[#b42318]/5 p-4 text-sm text-[#b42318]">{preview.message}</p>}

      {preview?.ok && !report && (
        <section aria-labelledby="previa" className="rounded-2xl bg-white p-6">
          <h2 id="previa" className="font-medium">Prévia</h2>
          <ul role="list" className="mt-4 grid gap-3 sm:grid-cols-3">
            {[["Novos", created, ""], ["Atualizados", updated, ""], ["Com erro (ficam de fora)", failed, failed ? "text-[#b42318]" : ""]].map(([label, value, tone]) => (
              <li key={label as string} className="rounded-xl bg-[#f5f5f3] p-4">
                <p className={`font-display text-3xl tracking-[-0.04em] ${tone}`}>{value}</p>
                <p className="text-xs text-black/60">{label}</p>
              </li>
            ))}
          </ul>
          {preview.unknownColumns.length > 0 && <p className="mt-3 text-xs text-black/60">Colunas ignoradas: {preview.unknownColumns.join(", ")}.</p>}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs text-black/60">
                <tr><th className="pb-2 font-medium">Linha</th><th className="pb-2 font-medium">Produto</th><th className="pb-2 font-medium">Ação</th><th className="pb-2 font-medium">Detalhes</th></tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.map((row) => (
                  <tr key={row.line} className="align-top">
                    <td className="py-2.5 pr-3 tabular-nums text-black/60">{row.line}</td>
                    <td className="py-2.5 pr-3">{row.name}{row.ok && <span className="block font-mono text-xs text-black/60">{row.slug}</span>}</td>
                    <td className="py-2.5 pr-3">
                      {row.ok ? (
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${row.action === "novo" ? "bg-[#1f7a3a]/10 text-[#1f7a3a]" : "bg-black/5"}`}>{row.action === "novo" ? "Novo" : "Atualizar"}</span>
                      ) : (
                        <span className="rounded-md bg-[#b42318]/10 px-2 py-0.5 text-xs font-medium text-[#b42318]">Erro</span>
                      )}
                    </td>
                    <td className="py-2.5 text-xs leading-5">
                      {row.ok ? (
                        <>
                          <span className="text-black/70">{formatPrice(row.priceCents)} · {row.fulfillment === "sob_encomenda" ? "sob encomenda" : "estoque próprio"} · {row.images} {row.images === 1 ? "foto" : "fotos"}{row.status === "draft" ? " · rascunho" : ""}</span>
                          {row.warnings.map((warning) => <span key={warning} className="block text-[#8a3a00]">{warning}</span>)}
                        </>
                      ) : (
                        row.errors.map((error) => <span key={error} className="block text-[#b42318]">{error}</span>)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={confirm} disabled={pending || created + updated === 0} className="inline-flex items-center gap-2 rounded-xl bg-[#b94f01] px-5 py-3 text-sm font-medium text-white hover:bg-[#9f4300] disabled:opacity-50">
              {pending && phase === "import" && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              Importar {created + updated} {created + updated === 1 ? "produto" : "produtos"}
            </button>
            {failed > 0 && <p className="text-xs text-black/60">As {failed} linhas com erro não serão importadas.</p>}
          </div>
        </section>
      )}

      {report && (
        <section aria-labelledby="relatorio" className="rounded-2xl bg-white p-6" role={report.ok ? "status" : "alert"}>
          <h2 id="relatorio" className="font-medium">Relatório</h2>
          {!report.ok ? (
            <p className="mt-3 text-sm text-[#b42318]">{report.message}</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <p><strong className="font-medium">{report.created.length}</strong> criados e <strong className="font-medium">{report.updated.length}</strong> atualizados.</p>
              {report.imageProblems.length > 0 && (
                <div className="rounded-xl bg-[#b94f01]/10 p-4 text-[#8a3a00]">
                  <p className="font-medium">Fotos com problema: estes produtos foram gravados como RASCUNHO.</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {report.imageProblems.map((problem) => <li key={problem.slug}><span className="font-medium">{problem.name}</span>: {problem.errors.join("; ")}</li>)}
                  </ul>
                </div>
              )}
              {report.skipped.length > 0 && (
                <div className="rounded-xl bg-[#b42318]/5 p-4 text-[#b42318]">
                  <p className="font-medium">Linhas não importadas (com erro):</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {report.skipped.map((row) => <li key={row.line}>Linha {row.line} ({row.name}): {row.errors.join(" ")}</li>)}
                  </ul>
                </div>
              )}
              <Link href="/admin/produtos" className="inline-block underline underline-offset-4">Ver produtos</Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
