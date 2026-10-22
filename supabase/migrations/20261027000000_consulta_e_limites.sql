-- Consulta de pedido e limite de tentativas centralizado (operação, fase 1d; usado também na fase 5).
--
-- 1) rate_limit_hits + rate_limit_hit(): o MESMO mecanismo da newsletter (contagem no banco por janela, com o IP guardado
--    só como hash com sal), agora num lugar só para checkout, cupom, consulta de pedido e newsletter. Só o servidor
--    (service_role) chama; ninguém lê a tabela.
-- 2) lookup_order(número, e-mail): o que /pedido/consultar mostra. Devolve NULL tanto para "não existe" quanto para
--    "e-mail errado" (a resposta é a mesma). Só os dados de acompanhamento: sem CPF, sem telefone, sem endereço completo
--    (só cidade/UF), sem a chave do link, sem o rastreio do fornecedor.

create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null check (char_length(bucket) between 1 and 40),
  key_hash text not null check (char_length(key_hash) between 16 and 128),
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_hits_idx on public.rate_limit_hits (bucket, key_hash, created_at);
alter table public.rate_limit_hits enable row level security;
revoke all on table public.rate_limit_hits from anon, authenticated, public;

-- true = pode seguir (e conta a tentativa); false = passou do limite na janela. A trava por chave serializa duas
-- tentativas simultâneas do mesmo IP (as duas não passam juntas no último lugar da janela).
create or replace function public.rate_limit_hit(p_bucket text, p_key_hash text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'LIMITE_INVALIDO';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_bucket || ':' || p_key_hash));
  delete from public.rate_limit_hits
    where bucket = p_bucket and key_hash = p_key_hash and created_at <= now() - make_interval(secs => p_window_seconds);
  select count(*) into v_count from public.rate_limit_hits where bucket = p_bucket and key_hash = p_key_hash;
  if v_count >= p_limit then
    return false;
  end if;
  insert into public.rate_limit_hits (bucket, key_hash) values (p_bucket, p_key_hash);
  return true;
end;
$$;
revoke all on function public.rate_limit_hit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, text, integer, integer) to service_role;

-- Faxina opcional (ex.: pg_cron diário): apaga tentativas com mais de 1 dia.
create or replace function public.rate_limit_cleanup() returns integer
language sql security definer set search_path = public as $$
  with gone as (delete from public.rate_limit_hits where created_at < now() - interval '1 day' returning 1)
  select count(*)::integer from gone;
$$;
revoke all on function public.rate_limit_cleanup() from public, anon, authenticated;
grant execute on function public.rate_limit_cleanup() to service_role;

create or replace function public.lookup_order(p_order_id text, p_email text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id,
    'created_at', o.created_at,
    'status', o.status,
    'payment_method', o.payment_method,
    'shipping', jsonb_build_object('label', o.shipping->>'label', 'days', o.shipping->>'days'),
    'city', o.address->>'city',
    'state', o.address->>'state',
    'total_cents', o.total_cents,
    'tracking_code', o.tracking_code,
    'shipped_at', o.shipped_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', i.name, 'size', i.size, 'image', i.image, 'quantity', i.quantity, 'slug', i.product_slug,
        'item_status', i.item_status, 'tracking_code', i.tracking_code
      ) order by i.name, i.size)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = upper(trim(p_order_id)) and o.customer_email = lower(trim(p_email));
$$;
revoke all on function public.lookup_order(text, text) from public, anon, authenticated;
grant execute on function public.lookup_order(text, text) to service_role;
