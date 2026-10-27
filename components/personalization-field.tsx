"use client";

import { useId } from "react";
import { ShirtPreview } from "@/components/shirt-preview";
import { formatPrice } from "@/lib/format";
import { normalizeName, type PersonalizationConfig } from "@/lib/personalization";

export type PersonalizationState = { enabled: boolean; name: string; number: string; errors: { name?: string; number?: string } };

// Campos "Personalizar" da página do produto (loja extra, item 3): nome e número com a prévia ao vivo. O nome já sai em
// maiúsculas e sem acento enquanto o cliente digita (é como ele será estampado); a validação completa (limite, faixa,
// palavras bloqueadas) roda ao adicionar e de novo no servidor.
export function PersonalizationField({ config, color, value, onChange }: { config: PersonalizationConfig; color: string; value: PersonalizationState; onChange: (next: PersonalizationState) => void }) {
  const id = useId();
  const set = (patch: Partial<PersonalizationState>) => onChange({ ...value, ...patch, errors: { ...value.errors, ...Object.fromEntries(Object.keys(patch).map((key) => [key, undefined])) } });
  return (
    <div className="rounded-2xl border border-black/10 p-4 sm:p-5">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-black">
        <input type="checkbox" checked={value.enabled} onChange={(event) => set({ enabled: event.target.checked })} className="size-4 shrink-0 accent-[#b94f01]" />
        Personalizar com nome e número
        {config.feeCents > 0 && <span className="font-normal text-black/60">(+{formatPrice(config.feeCents)})</span>}
      </label>
      {value.enabled && (
        <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-start">
          <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3">
            <div>
              <label htmlFor={`${id}-nome`} className="mb-1.5 block text-xs font-medium text-black/70">Nome (até {config.maxName})</label>
              <input
                id={`${id}-nome`}
                value={value.name}
                maxLength={config.maxName}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={Boolean(value.errors.name)}
                aria-describedby={value.errors.name ? `${id}-nome-erro` : undefined}
                onChange={(event) => set({ name: normalizeName(event.target.value).slice(0, config.maxName) })}
                className={`w-full rounded-xl border bg-white px-3 py-3 text-base uppercase tracking-[0.06em] text-black outline-none transition focus-visible:border-black sm:text-sm ${value.errors.name ? "border-[#b42318]" : "border-black/20 hover:border-black/40"}`}
              />
              {value.errors.name && <p id={`${id}-nome-erro`} className="mt-1.5 text-xs text-[#b42318]">{value.errors.name}</p>}
            </div>
            <div>
              <label htmlFor={`${id}-numero`} className="mb-1.5 block text-xs font-medium text-black/70">Número</label>
              <input
                id={`${id}-numero`}
                value={value.number}
                inputMode="numeric"
                autoComplete="off"
                maxLength={String(config.numberMax).length}
                aria-invalid={Boolean(value.errors.number)}
                aria-describedby={value.errors.number ? `${id}-numero-erro` : `${id}-numero-dica`}
                onChange={(event) => set({ number: event.target.value.replace(/\D/g, "").slice(0, String(config.numberMax).length) })}
                className={`w-full rounded-xl border bg-white px-3 py-3 text-base tabular-nums text-black outline-none transition focus-visible:border-black sm:text-sm ${value.errors.number ? "border-[#b42318]" : "border-black/20 hover:border-black/40"}`}
              />
              {value.errors.number ? (
                <p id={`${id}-numero-erro`} className="mt-1.5 text-xs text-[#b42318]">{value.errors.number}</p>
              ) : (
                <p id={`${id}-numero-dica`} className="mt-1.5 text-xs text-black/60">{config.numberMin} a {config.numberMax}</p>
              )}
            </div>
            <p className="col-span-2 text-xs leading-5 text-black/60">Letras sem acento, números, espaço e hífen. Peça personalizada não entra em kits.</p>
          </div>
          <figure className="mx-auto w-40 sm:w-full">
            <ShirtPreview name={value.name.trim()} number={value.number} color={color} back={config.back} className="w-full" />
            <figcaption className="mt-1 text-center text-[11px] text-black/60">Prévia das costas</figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
