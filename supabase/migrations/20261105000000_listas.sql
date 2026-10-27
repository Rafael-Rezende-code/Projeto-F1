-- Loja extra, item 4: lista de desejos com link curto (/desejos/<token>). Sem acesso direto do público: o servidor do site
-- (service role) cria, atualiza (com a chave de edição que fica só no aparelho de quem criou; aqui, só o hash) e lê pelo
-- token. A criação é limitada por IP no servidor (lib/rate-limit.ts, balde "lista"). Admin pode ler. Idempotente.

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  name text not null default '',
  product_slugs text[] not null default '{}',
  secret_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $$ begin
  alter table public.wishlists add constraint wishlists_token_check check (token ~ '^[A-Za-z0-9]{10}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.wishlists add constraint wishlists_size_check check (length(name) <= 30 and coalesce(array_length(product_slugs, 1), 0) <= 60);
exception when duplicate_object then null; end $$;
drop trigger if exists wishlists_touch on public.wishlists;
create trigger wishlists_touch before update on public.wishlists for each row execute function public.touch_updated_at();

alter table public.wishlists enable row level security;
revoke all on table public.wishlists from anon, authenticated, public;
grant select on table public.wishlists to authenticated;
drop policy if exists "admin le listas" on public.wishlists;
create policy "admin le listas" on public.wishlists for select to authenticated using (public.is_admin());
