-- Histórico do pedido, cancelamento, reembolso, pedidos de teste e indicadores do painel (operação, fase 2).
--
-- * order_events: linha do tempo de cada pedido. Gravada por GATILHOS (criação, mudança de status, rastreio, status de
--   item) e pelas funções abaixo; ninguém de fora lê; admin lê (RLS). Quem fez: e-mail do admin logado ou "sistema"
--   (webhook, checkout).
-- * cancel_order(pedido, motivo, confirmar_enviado): numa transação, cancela e devolve estoque e uso do cupom
--   (release_order_stock, idempotente). Pedido já enviado/entregue só com confirmação explícita. Só admin (ou o servidor).
-- * mark_order_refunded(pedido, nota): registro MANUAL de reembolso feito no provedor (não chama o provedor).
-- * orders.is_test: pedidos de teste, fora dos indicadores por padrão.
-- * admin_dashboard(desde, limite_estoque, incluir_testes): números do início do painel numa consulta só.

alter table public.orders
  add column if not exists is_test boolean not null default false,
  add column if not exists cancel_reason text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_note text;
create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id text not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('criado', 'status', 'rastreio', 'item', 'cancelado', 'reembolsado', 'teste', 'nota')),
  message text not null check (char_length(message) between 1 and 600),
  actor text not null default 'sistema',
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);
alter table public.order_events enable row level security;
revoke all on table public.order_events from anon, public;
grant select on table public.order_events to authenticated;
create policy "admin le" on public.order_events for select to authenticated using (public.is_admin());

-- Quem está agindo: e-mail do JWT (admin no painel) ou "sistema".
create or replace function public.event_actor() returns text
language sql stable as $$
  select coalesce(nullif(lower(auth.jwt() ->> 'email'), ''), 'sistema')
$$;

create or replace function public.log_order_event(p_order_id text, p_kind text, p_message text, p_data jsonb default '{}')
returns void
language sql security definer set search_path = public as $$
  insert into public.order_events (order_id, kind, message, actor, data)
  values (p_order_id, p_kind, left(p_message, 600), public.event_actor(), coalesce(p_data, '{}'::jsonb));
$$;
revoke all on function public.log_order_event(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_order_event(text, text, text, jsonb) to service_role;

create or replace function public.orders_log_events() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_order_event(new.id, 'criado', 'Pedido criado (' || new.status || ').', jsonb_build_object('status', new.status, 'total_cents', new.total_cents));
    return new;
  end if;
  if new.status is distinct from old.status then
    perform public.log_order_event(new.id, 'status', 'Status: ' || old.status || ' → ' || new.status || '.', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.tracking_code is distinct from old.tracking_code and new.tracking_code is not null then
    perform public.log_order_event(new.id, 'rastreio', 'Rastreio: ' || new.tracking_code || '.', jsonb_build_object('tracking_code', new.tracking_code));
  end if;
  if new.is_test is distinct from old.is_test then
    perform public.log_order_event(new.id, 'teste', case when new.is_test then 'Marcado como pedido de teste.' else 'Desmarcado como pedido de teste.' end);
  end if;
  return new;
end;
$$;
drop trigger if exists orders_log_events on public.orders;
create trigger orders_log_events after insert or update on public.orders for each row execute function public.orders_log_events();

create or replace function public.order_items_log_events() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.item_status is distinct from old.item_status then
    perform public.log_order_event(new.order_id, 'item', new.name || ' (' || new.size || '): ' || old.item_status || ' → ' || new.item_status || '.',
      jsonb_build_object('sku', new.sku, 'from', old.item_status, 'to', new.item_status));
  end if;
  return new;
end;
$$;
drop trigger if exists order_items_log_events on public.order_items;
create trigger order_items_log_events after update on public.order_items for each row execute function public.order_items_log_events();

-- Admin no painel OU o servidor (service_role). Dentro de função security definer o current_user vira o dono da função;
-- o papel de quem chamou continua no parâmetro "role" (o PostgREST faz "set role") e no JWT.
create or replace function public.can_manage_orders() returns boolean
language sql stable as $$
  select current_setting('role', true) = 'service_role' or coalesce(auth.jwt() ->> 'role', '') = 'service_role' or public.is_admin()
$$;

create or replace function public.cancel_order(p_order_id text, p_reason text, p_confirm_shipped boolean default false)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.can_manage_orders() then
    raise exception 'SEM_PERMISSAO' using errcode = '42501';
  end if;
  if char_length(v_reason) < 3 or char_length(v_reason) > 500 then
    raise exception 'MOTIVO_OBRIGATORIO';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'PEDIDO_INEXISTENTE';
  end if;
  if v_order.status = 'cancelado' then
    return v_order; -- idempotente: cancelar de novo não devolve estoque duas vezes
  end if;
  if v_order.status in ('enviado', 'entregue') and not coalesce(p_confirm_shipped, false) then
    raise exception 'CONFIRMAR_ENVIADO';
  end if;
  update public.orders set status = 'cancelado', cancel_reason = v_reason, cancelled_at = now() where id = p_order_id
    returning * into v_order;
  perform public.release_order_stock(p_order_id);
  perform public.log_order_event(p_order_id, 'cancelado', 'Cancelado: ' || v_reason,
    jsonb_build_object('reason', v_reason, 'was_shipped', coalesce(p_confirm_shipped, false)));
  return v_order;
end;
$$;
revoke all on function public.cancel_order(text, text, boolean) from public, anon;
grant execute on function public.cancel_order(text, text, boolean) to authenticated, service_role;

create or replace function public.mark_order_refunded(p_order_id text, p_note text)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_note text := btrim(coalesce(p_note, ''));
begin
  if not public.can_manage_orders() then
    raise exception 'SEM_PERMISSAO' using errcode = '42501';
  end if;
  if char_length(v_note) < 3 or char_length(v_note) > 500 then
    raise exception 'NOTA_OBRIGATORIA';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'PEDIDO_INEXISTENTE';
  end if;
  if v_order.status <> 'cancelado' then
    raise exception 'SO_CANCELADO';
  end if;
  if v_order.refunded_at is not null then
    return v_order;
  end if;
  update public.orders set refunded_at = now(), refund_note = v_note where id = p_order_id returning * into v_order;
  perform public.log_order_event(p_order_id, 'reembolsado', 'Reembolso registrado: ' || v_note, jsonb_build_object('note', v_note));
  return v_order;
end;
$$;
revoke all on function public.mark_order_refunded(text, text) from public, anon;
grant execute on function public.mark_order_refunded(text, text) to authenticated, service_role;

-- Indicadores do painel. "Pedidos" e "faturamento" contam só pedidos PAGOS (pago, enviado, entregue), criados desde
-- p_since. Security invoker: roda com as permissões de quem chama (RLS de admin) e recusa quem não é admin.
create or replace function public.admin_dashboard(p_since timestamptz, p_low_stock integer default 3, p_include_test boolean default false)
returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  v_result jsonb;
begin
  if not public.can_manage_orders() then
    raise exception 'SEM_PERMISSAO' using errcode = '42501';
  end if;
  with paid as (
    select o.* from public.orders o
    where o.created_at >= p_since and o.status in ('pago', 'enviado', 'entregue') and (p_include_test or not o.is_test)
  ),
  days as (
    select (o.created_at at time zone 'America/Sao_Paulo')::date as day, count(*) as orders, sum(o.total_cents) as revenue
    from paid o group by 1
  ),
  best as (
    select i.product_slug as slug, min(i.name) as name, sum(i.quantity)::integer as quantity, sum(i.quantity * i.unit_price_cents)::bigint as revenue
    from public.order_items i join paid o on o.id = i.order_id
    group by i.product_slug order by quantity desc, revenue desc limit 5
  ),
  low as (
    select v.sku, v.size, v.stock, p.name, p.slug
    from public.product_variants v join public.products p on p.id = v.product_id
    where v.stock <= greatest(p_low_stock, 0) and p.status = 'active'
    order by v.stock, p.name limit 20
  )
  select jsonb_build_object(
    'orders', (select count(*) from paid),
    'revenue_cents', (select coalesce(sum(total_cents), 0) from paid),
    'average_cents', (select coalesce(round(avg(total_cents)), 0) from paid),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'orders', orders, 'revenue_cents', revenue) order by day) from days), '[]'::jsonb),
    'best_sellers', coalesce((select jsonb_agg(to_jsonb(best)) from best), '[]'::jsonb),
    'awaiting_supplier', (
      select count(*) from public.order_items i join public.orders o on o.id = i.order_id
      where i.item_status = 'aguardando-compra' and o.status = 'pago' and (p_include_test or not o.is_test)
    ),
    'paid_not_shipped', (select count(*) from public.orders o where o.status = 'pago' and (p_include_test or not o.is_test)),
    'low_stock', coalesce((select jsonb_agg(to_jsonb(low)) from low), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.admin_dashboard(timestamptz, integer, boolean) from public, anon;
grant execute on function public.admin_dashboard(timestamptz, integer, boolean) to authenticated, service_role;
