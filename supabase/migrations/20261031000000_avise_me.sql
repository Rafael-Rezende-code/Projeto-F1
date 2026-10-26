-- "Avise-me quando chegar" (refino 3, item 2.4): e-mails de quem quer saber quando um TAMANHO ESGOTADO voltar.
--
-- Inscrição PÚBLICA E LIMITADA (mesmo padrão da newsletter): a chave pública (anon) só INSERE, só nas 5 colunas abaixo,
-- só com consentimento e só para uma variante que existe, está publicada e está com estoque 0. Não lê, não altera, não
-- apaga. Um e-mail por variante (o repetido não grava de novo). Limite por IP no servidor (lib/rate-limit.ts, balde
-- "avise-me") e aqui no banco (gatilho: 10 por IP por hora e 300 no total por hora; o IP só entra como hash com sal).
-- Leitura, edição (marcar como avisado) e exclusão: só administradores (RLS + is_admin()). O envio do aviso é manual
-- (lista e CSV em /admin/avise-me); não há e-mail automático.
create table public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and char_length(email) between 5 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  sku text not null references public.product_variants (sku) on update cascade on delete cascade,
  consent boolean not null check (consent),
  consent_text text not null check (char_length(consent_text) between 10 and 600),
  ip_hash text check (ip_hash is null or char_length(ip_hash) between 16 and 128),
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (email, sku)
);
create index stock_alerts_sku_idx on public.stock_alerts (sku, created_at);
create index stock_alerts_ip_idx on public.stock_alerts (ip_hash, created_at);

create or replace function public.stock_alert_limits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.ip_hash is not null
     and (select count(*) from public.stock_alerts where ip_hash = new.ip_hash and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'LIMITE_POR_IP';
  end if;
  if (select count(*) from public.stock_alerts where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'LIMITE_GLOBAL';
  end if;
  return new;
end;
$$;
create trigger stock_alert_limits before insert on public.stock_alerts for each row execute function public.stock_alert_limits();

-- A variante pode receber aviso? (existe, produto publicado, estoque 0). security definer: a política do visitante
-- consulta o catálogo sem depender das permissões dele.
create or replace function public.stock_alert_allowed(p_sku text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.product_variants v join public.products p on p.id = v.product_id
    where v.sku = p_sku and v.stock = 0 and p.status = 'active'
  );
$$;
revoke all on function public.stock_alert_allowed(text) from public;
grant execute on function public.stock_alert_allowed(text) to anon, authenticated, service_role;

alter table public.stock_alerts enable row level security;

revoke all on table public.stock_alerts from anon, authenticated, public;
grant insert (email, sku, consent, consent_text, ip_hash) on public.stock_alerts to anon, authenticated;
grant select, update, delete on public.stock_alerts to authenticated;

create policy "aviso publico" on public.stock_alerts for insert to anon, authenticated
  with check (consent = true and notified_at is null and public.stock_alert_allowed(sku));
create policy "admin le avisos" on public.stock_alerts for select to authenticated using (public.is_admin());
create policy "admin altera avisos" on public.stock_alerts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin apaga avisos" on public.stock_alerts for delete to authenticated using (public.is_admin());
