import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// 404 no tom da marca: o visitante "saiu da pista". Grande 404 vazado ao fundo e duas saídas claras.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black [color-scheme:light]">
      <SiteHeader />
      <main className="relative flex flex-1 items-center overflow-hidden px-5 py-24 sm:px-10">
        <span
          aria-hidden="true"
          className="font-display pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center text-[38vw] leading-none text-transparent [-webkit-text-stroke:1px_rgba(0,0,0,0.08)] sm:text-[30vw]"
        >
          404
        </span>
        <div className="relative mx-auto max-w-xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Bandeira amarela · erro 404</p>
          <h1 className="mt-4 text-5xl sm:text-7xl">Você saiu da pista.</h1>
          <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-black/60 sm:text-base">
            Essa curva não existe no traçado. Volte para os boxes ou acelere direto para a coleção.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/produtos" className="rounded-xl bg-[#b94f01] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#9f4300]">
              Acelerar para a coleção
            </Link>
            <Link href="/" className="rounded-xl border border-black/20 px-6 py-3 text-sm font-medium transition hover:border-black">
              Voltar aos boxes
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
