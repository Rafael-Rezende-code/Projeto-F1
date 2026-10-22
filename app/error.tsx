"use client";

import Link from "next/link";
import { useEffect } from "react";

// Erro inesperado numa página (o cabeçalho e o rodapé do layout continuam). No tom do 404: "algo saiu da pista", com
// "Tentar de novo" (refaz o trecho que falhou) e a volta para a home. O detalhe técnico vai só para o console.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-[60vh] items-center bg-white px-5 py-24 text-black [color-scheme:light] sm:px-10">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Bandeira vermelha</p>
        <h1 className="mt-4 text-5xl sm:text-6xl">Algo saiu da pista.</h1>
        <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-black/60 sm:text-base">
          Tivemos um problema para mostrar esta página. Tente de novo; se continuar, volte para a home.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-xl bg-[#b94f01] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#9f4300]">
            Tentar de novo
          </button>
          <Link href="/" className="rounded-xl border border-black/20 px-6 py-3 text-sm font-medium transition hover:border-black">
            Voltar para a home
          </Link>
        </div>
        {error.digest && <p className="mt-6 text-xs text-black/60">Código do erro: {error.digest}</p>}
      </div>
    </main>
  );
}
