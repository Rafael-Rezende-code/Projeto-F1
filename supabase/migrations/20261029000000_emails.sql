-- E-mails transacionais (operação, fase 3): registro idempotente. Um e-mail de cada tipo por pedido (único em pedido +
-- tipo): o webhook pode chegar duas vezes, o checkout e o webhook podem disparar juntos, e mesmo assim sai um só.
--   claim_order_email(pedido, tipo)  → true só para quem "pegou" o envio (linha nova, ou falha anterior com < 5 tentativas)
--   finish_order_email(...)          → marca enviado ou falhou
-- Só o servidor (service_role) executa; admin lê o registro (RLS). O conteúdo do e-mail NÃO é guardado.

create table if not exists public.email_log (
  id bigint generated always as identity primary key,
  order_id text not null references public.orders (id) on delete cascade,
  type text not null check (type in ('pedido-recebido', 'pagamento-aprovado', 'enviado', 'cancelado')),
  status text not null default 'enviando' check (status in ('enviando', 'enviado', 'falhou')),
  attempts integer not null default 1,
  provider text,
  provider_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, type)
);
alter table public.email_log enable row level security;
revoke all on table public.email_log from anon, public;
grant select on table public.email_log to authenticated;
create policy "admin le" on public.email_log for select to authenticated using (public.is_admin());

create or replace function public.claim_order_email(p_order_id text, p_type text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into public.email_log (order_id, type) values (p_order_id, p_type) on conflict (order_id, type) do nothing;
  if found then
    return true;
  end if;
  -- já existe: só tenta de novo se a última falhou (e com teto de tentativas); "enviando" travado há mais de 10 min
  -- (processo que caiu no meio) também pode ser retomado.
  update public.email_log set status = 'enviando', attempts = attempts + 1, error = null, updated_at = now()
    where order_id = p_order_id and type = p_type and attempts < 5
      and (status = 'falhou' or (status = 'enviando' and updated_at < now() - interval '10 minutes'));
  return found;
end;
$$;
revoke all on function public.claim_order_email(text, text) from public, anon, authenticated;
grant execute on function public.claim_order_email(text, text) to service_role;

create or replace function public.finish_order_email(p_order_id text, p_type text, p_ok boolean, p_provider text, p_provider_id text, p_error text)
returns void
language sql security definer set search_path = public as $$
  update public.email_log
    set status = case when p_ok then 'enviado' else 'falhou' end, provider = p_provider, provider_id = p_provider_id,
        error = left(p_error, 300), updated_at = now()
    where order_id = p_order_id and type = p_type;
$$;
revoke all on function public.finish_order_email(text, text, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.finish_order_email(text, text, boolean, text, text, text) to service_role;
