import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Painel admin (fase 11): fora do índice (noindex + robots.txt + fora do sitemap), sem o cabeçalho da loja.
// Sem Supabase configurado, todas as rotas mostram como ativar (docs/backend/admin.md).
export const metadata: Metadata = { title: "Painel", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-[#f5f5f3] text-black [color-scheme:light]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link href="/admin" className="font-playfair text-xl italic tracking-[-0.05em]">
            {BRAND.name}
            <span className="text-[#b94f01]">{BRAND.mark}</span> <span className="font-sans text-xs not-italic tracking-normal text-black/60">painel</span>
          </Link>
          {isSupabaseConfigured() && (
            <nav aria-label="Painel" className="flex items-center gap-1 text-sm">
              <Link href="/admin/produtos" className="rounded-xl px-3 py-2 hover:bg-black/5">Produtos</Link>
              <Link href="/admin/pedidos" className="rounded-xl px-3 py-2 hover:bg-black/5">Pedidos</Link>
              <Link href="/admin/fornecedor" className="rounded-xl px-3 py-2 hover:bg-black/5">Fornecedor</Link>
              <form action="/admin/sair" method="post">
                <button type="submit" className="rounded-xl px-3 py-2 text-black/60 hover:bg-black/5 hover:text-black">Sair</button>
              </form>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8">{isSupabaseConfigured() ? children : <Disabled />}</main>
    </div>
  );
}

function Disabled() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Painel desligado</p>
      <h1 className="mt-3 text-3xl tracking-[-0.04em]">O painel precisa do Supabase.</h1>
      <p className="mt-4 text-sm leading-7 text-black/70">
        Produtos, estoque e pedidos são gerenciados no banco de dados. Enquanto o Supabase não estiver configurado, a loja
        usa o catálogo de demonstração do código e os pedidos são simulados, então não há nada para administrar aqui.
      </p>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm leading-6 text-black/80">
        <li>Crie o projeto no Supabase e rode a migração e o seed (<code>docs/backend/supabase.md</code>).</li>
        <li>Cadastre os e-mails de quem administra na tabela <code>admin_emails</code> e na variável <code>ADMIN_EMAILS</code>.</li>
        <li>Configure <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e <code>SUPABASE_SERVICE_ROLE_KEY</code> e faça um novo deploy.</li>
        <li>Entre em <code>/admin/entrar</code> com o seu e-mail (link mágico).</li>
      </ol>
      <p className="mt-6 text-sm text-black/60">Passo a passo completo em <code>docs/backend/admin.md</code>.</p>
    </div>
  );
}
