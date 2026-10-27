-- Loja extra, item 5: semana de corrida. Calendário editado no painel (/admin/corridas) ou importado da temporada (fonte
-- aberta, gravado aqui pelo painel; o site nunca consulta a fonte durante o uso). Público lê só as ativas; o resto, admin.
-- Sem linhas, o bloco "Próxima corrida" não aparece. Idempotente.

create table if not exists public.race_weekends (
  id uuid primary key default gen_random_uuid(),
  gp_name text not null,
  circuit text not null default '',
  country text not null default '',
  weekend_start date not null,
  race_start timestamptz not null,
  collection_slug text,
  tags text[] not null default '{}',
  active boolean not null default true,
  -- Origem da importação (ex.: "jolpica-2027-05"): reimportar atualiza em vez de duplicar.
  source_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $$ begin
  alter table public.race_weekends add constraint race_weekends_dates_check check (weekend_start <= (race_start at time zone 'America/Sao_Paulo')::date);
exception when duplicate_object then null; end $$;
create index if not exists race_weekends_race_start_idx on public.race_weekends (race_start);
drop trigger if exists race_weekends_touch on public.race_weekends;
create trigger race_weekends_touch before update on public.race_weekends for each row execute function public.touch_updated_at();

alter table public.race_weekends enable row level security;
revoke all on table public.race_weekends from anon, public;
grant select on table public.race_weekends to anon, authenticated;
grant insert, update, delete on table public.race_weekends to authenticated;
drop policy if exists "corridas ativas publicas" on public.race_weekends;
create policy "corridas ativas publicas" on public.race_weekends for select to anon, authenticated using (active or public.is_admin());
drop policy if exists "admin altera corridas" on public.race_weekends;
create policy "admin altera corridas" on public.race_weekends for all to authenticated using (public.is_admin()) with check (public.is_admin());
