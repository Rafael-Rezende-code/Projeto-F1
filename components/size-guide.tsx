"use client";

import { useRef, useState } from "react";
import { Ruler, X } from "lucide-react";
import { useModal } from "@/components/use-modal";

// Guia de tamanhos em modal. Tabela PLACEHOLDER: as medidas reais dependem do fornecedor e devem ser confirmadas.
const ROWS = [
  { size: "P", chest: "[00–00]", length: "[00]" },
  { size: "M", chest: "[00–00]", length: "[00]" },
  { size: "G", chest: "[00–00]", length: "[00]" },
  { size: "GG", chest: "[00–00]", length: "[00]" },
];

export function SizeGuide() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useModal(open, panelRef, close);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="inline-flex items-center gap-1.5 text-xs text-black/70 underline underline-offset-4 hover:text-black">
        <Ruler size={14} aria-hidden="true" /> Guia de tamanhos
      </button>
      {open && (
        <div className="fixed inset-0 z-[97] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <div onClick={close} className="absolute inset-0 bg-black/50" />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guia-titulo"
            className="relative w-full max-w-lg rounded-t-2xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-black shadow-2xl [color-scheme:light] sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Medidas</p>
                <h2 id="guia-titulo" className="mt-2 text-2xl">
                  Guia de tamanhos
                </h2>
              </div>
              <button type="button" data-autofocus onClick={close} aria-label="Fechar guia de tamanhos" className="rounded-xl p-2 transition hover:bg-black/5">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <table className="mt-6 w-full text-left text-sm">
              <caption className="sr-only">Medidas por tamanho, em centímetros</caption>
              <thead>
                <tr className="border-b border-black/10 text-xs text-black/60">
                  <th scope="col" className="py-2 font-medium">Tamanho</th>
                  <th scope="col" className="py-2 font-medium">Tórax (cm)</th>
                  <th scope="col" className="py-2 font-medium">Comprimento (cm)</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.size} className="border-b border-black/10">
                    <th scope="row" className="py-3 font-medium">{row.size}</th>
                    <td className="py-3 text-black/70">{row.chest}</td>
                    <td className="py-3 text-black/70">{row.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 rounded-xl border border-dashed border-[#b94f01]/50 bg-[#b94f01]/5 px-4 py-3 text-xs font-medium text-[#8a3a00]">
              [MEDIDAS A CONFIRMAR COM O FORNECEDOR]
            </p>
          </div>
        </div>
      )}
    </>
  );
}
