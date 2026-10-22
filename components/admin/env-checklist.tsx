import { adminEnvStatus, ROTEIRO_TESTE_ADMIN } from "@/lib/admin/env-status";

// Lista de variáveis do painel com ✓/✗ (feat/carros A4). Só nomes; nunca valores.
export function EnvChecklist() {
  const status = adminEnvStatus();
  return (
    <div className="mt-6">
      <ul role="list" className="divide-y divide-black/5 rounded-xl border border-black/10 text-sm">
        {status.map((item) => (
          <li key={item.name} className="flex items-start gap-3 px-4 py-3">
            <span aria-hidden="true" className={`mt-0.5 w-4 shrink-0 text-center font-semibold ${item.set ? "text-[#1f7a3a]" : "text-[#b42318]"}`}>{item.set ? "✓" : "✗"}</span>
            <span className="min-w-0">
              <code className="break-all font-mono text-xs text-black">{item.name}</code>
              <span className="sr-only">{item.set ? ": definida" : ": ausente"}</span>
              <span className="block text-xs text-black/60">{item.why}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl bg-[#b94f01]/10 p-3 text-xs leading-5 text-[#8a3a00]">
        Variáveis que começam com <code>NEXT_PUBLIC_</code> só valem depois de um <strong>novo deploy</strong> (elas entram no
        código na hora do build). As outras valem na próxima requisição, mas o mais seguro é fazer um novo deploy também.
      </p>
      <p className="mt-3 text-sm">
        Passo a passo: <a href={ROTEIRO_TESTE_ADMIN} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">docs/backend/roteiro-teste-admin.md<span className="sr-only"> (abre em nova aba)</span></a>
      </p>
    </div>
  );
}
