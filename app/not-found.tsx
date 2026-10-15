import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <SiteHeader />
      <main className="flex flex-1 items-center px-5 py-24 sm:px-10">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Erro 404</p>
          <h1 className="mt-4 text-5xl font-medium tracking-[-0.07em] sm:text-7xl">Saímos da pista.</h1>
          <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-black/55 sm:text-base">
            A página que você procura não existe ou mudou de lugar. Volte para o início ou veja a coleção.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/produtos" className="rounded-xl bg-[#b94f01] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#9f4300]">
              Ver a coleção
            </Link>
            <Link href="/" className="rounded-xl border border-black/20 px-6 py-3 text-sm font-medium transition hover:border-black">
              Voltar ao início
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
