-- Apex: ATUALIZAÇÃO 2 do Supabase (gerado por scripts/supabase/setup-completo.mjs; NÃO editar à mão).
-- Para o banco que JÁ ESTÁ NO AR (já recebeu o setup completo até 20261025000000). NÃO contém seed: não mexe em produtos
-- nem em estoque. Pode rodar mais de uma vez. Cole tudo no SQL Editor e clique em Run (docs/backend/supabase.md).
--
-- Contém, nesta ordem: 20261026000000_cupons.sql, 20261027000000_consulta_e_limites.sql, 20261028000000_eventos_e_cancelamento.sql.

-- =====================================================================================================
-- 20261026000000_cupons.sql
-- =====================================================================================================
-- Cupons de desconto (operação, fase 1c). Idempotente: pode rodar de novo (if not exists / drop ... if exists / create or
-- replace). Não altera as migrations anteriores: recria create_order e release_order_stock com o cupom.
--
-- Regras (as mesmas de lib/coupons.ts, que só serve para mostrar a prévia; quem decide é o banco):
-- * código único sem diferenciar maiúsculas; tipos: percentual (1–100), valor_fixo (centavos) e frete_gratis;
-- * vale entre starts_at e ends_at (vazios = sem limite), com subtotal mínimo e limite de usos;
-- * o desconto nos itens NUNCA passa do subtotal dos itens; frete grátis zera o frete (desconto de frete à parte);
-- * o uso é contado DENTRO da create_order, com UPDATE condicional (uses < max_uses): dois pedidos ao mesmo tempo não
--   passam do limite. Pedido cancelado/recusado devolve o uso (release_order_stock).
-- Acesso: ninguém de fora lê a tabela (os códigos não vazam); a prévia é a função quote_coupon (só devolve o resultado
-- para o código digitado). Administração: só admin (RLS).

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null check (char_length(code) between 3 and 40 and code ~ '^[A-Za-z0-9_-]+$'),
  kind text not null check (kind in ('percentual', 'valor_fixo', 'frete_gratis')),
  value integer not null default 0 check (value >= 0),
  min_subtotal_cents integer not null default 0 check (min_subtotal_cents >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  active boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_percent_range check (kind <> 'percentual' or value between 1 and 100),
  constraint coupons_fixed_positive check (kind <> 'valor_fixo' or value > 0),
  constraint coupons_period check (starts_at is null or ends_at is null or ends_at > starts_at)
);
create unique index if not exists coupons_code_unique on public.coupons (lower(code));
drop trigger if exists coupons_touch on public.coupons;
drop trigger if exists coupons_touch on public.coupons;
create trigger coupons_touch before update on public.coupons for each row execute function public.touch_updated_at();

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete restrict,
  order_id text not null unique references public.orders (id) on delete cascade,
  discount_cents integer not null check (discount_cents >= 0),
  shipping_discount_cents integer not null default 0 check (shipping_discount_cents >= 0),
  released boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id, created_at desc);

alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists discount_cents integer not null default 0 check (discount_cents >= 0),
  add column if not exists shipping_discount_cents integer not null default 0 check (shipping_discount_cents >= 0);

-- ---------------------------------------------------------------------------------------------------------------------
-- Avaliação de um cupom (pura, sem gravar): usada pela prévia e pela create_order.
-- Devolve { ok, reason, discount_cents, shipping_discount_cents, kind, code }. reason: inexistente | inativo |
-- ainda_nao_comecou | expirado | minimo | esgotado.
create or replace function public.coupon_evaluate(p_coupon public.coupons, p_subtotal_cents integer, p_shipping_cents integer)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  v_discount integer := 0;
  v_shipping integer := 0;
begin
  if p_coupon.id is null then return jsonb_build_object('ok', false, 'reason', 'inexistente'); end if;
  if not p_coupon.active then return jsonb_build_object('ok', false, 'reason', 'inativo'); end if;
  if p_coupon.starts_at is not null and now() < p_coupon.starts_at then return jsonb_build_object('ok', false, 'reason', 'ainda_nao_comecou'); end if;
  if p_coupon.ends_at is not null and now() >= p_coupon.ends_at then return jsonb_build_object('ok', false, 'reason', 'expirado'); end if;
  if p_subtotal_cents < p_coupon.min_subtotal_cents then
    return jsonb_build_object('ok', false, 'reason', 'minimo', 'min_subtotal_cents', p_coupon.min_subtotal_cents);
  end if;
  if p_coupon.max_uses is not null and p_coupon.uses >= p_coupon.max_uses then return jsonb_build_object('ok', false, 'reason', 'esgotado'); end if;
  if p_coupon.kind = 'percentual' then
    v_discount := floor(p_subtotal_cents::numeric * p_coupon.value / 100);
  elsif p_coupon.kind = 'valor_fixo' then
    v_discount := p_coupon.value;
  elsif p_coupon.kind = 'frete_gratis' then
    v_shipping := greatest(coalesce(p_shipping_cents, 0), 0);
  end if;
  v_discount := least(greatest(v_discount, 0), p_subtotal_cents);
  return jsonb_build_object('ok', true, 'code', p_coupon.code, 'kind', p_coupon.kind, 'discount_cents', v_discount, 'shipping_discount_cents', v_shipping);
end;
$$;

-- Prévia para o carrinho/checkout: só o resultado do código digitado (security definer: o visitante não lê a tabela).
-- O subtotal e o frete vêm do SERVIDOR do site (calculados pelo catálogo), não do navegador.
create or replace function public.quote_coupon(p_code text, p_subtotal_cents integer, p_shipping_cents integer default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_coupon public.coupons;
begin
  select * into v_coupon from public.coupons where lower(code) = lower(trim(coalesce(p_code, '')));
  return public.coupon_evaluate(v_coupon, greatest(coalesce(p_subtotal_cents, 0), 0), greatest(coalesce(p_shipping_cents, 0), 0));
end;
$$;
revoke all on function public.quote_coupon(text, integer, integer) from public;
grant execute on function public.quote_coupon(text, integer, integer) to anon, authenticated, service_role;
revoke all on function public.coupon_evaluate(public.coupons, integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- create_order com cupom: igual à anterior (modelo de venda) + p_order.coupon (código). O cupom é revalidado aqui, o uso
-- incrementado com UPDATE condicional e o resgate gravado; erro → 'CUPOM_INVALIDO' com o motivo em DETAIL e NADA é gravado.
create or replace function public.create_order(p_order jsonb) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_qty integer;
  v_variant record;
  v_missing jsonb := '[]'::jsonb;
  v_customer_id uuid;
  v_subtotal integer := 0;
  v_shipping integer := coalesce((p_order -> 'shipping' ->> 'priceCents')::integer, 0);
  v_code text := nullif(trim(coalesce(p_order ->> 'coupon', '')), '');
  v_coupon public.coupons;
  v_eval jsonb;
  v_discount integer := 0;
  v_shipping_discount integer := 0;
  v_order public.orders;
begin
  if jsonb_array_length(coalesce(p_order -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'PEDIDO_VAZIO';
  end if;

  for v_item in select * from jsonb_array_elements(p_order -> 'items') loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then raise exception 'QUANTIDADE_INVALIDA'; end if;
    update public.product_variants pv
      set stock = pv.stock - v_qty
      from public.products p
      where pv.sku = v_item ->> 'sku' and p.id = pv.product_id and p.status = 'active' and pv.stock >= v_qty
      returning pv.sku, pv.product_id, pv.size, p.slug, p.name, p.price_cents, p.fulfillment, p.dispatch_min_days,
        p.dispatch_max_days, p.origin,
        (select src from public.product_images i where i.product_id = p.id order by position limit 1) as image
      into v_variant;
    if not found then
      v_missing := v_missing || jsonb_build_object('sku', v_item ->> 'sku',
        'available', coalesce((select stock from public.product_variants where sku = v_item ->> 'sku'), 0));
    else
      v_subtotal := v_subtotal + v_variant.price_cents * v_qty;
      v_item := v_item || jsonb_build_object('product_id', v_variant.product_id, 'size', v_variant.size,
        'slug', v_variant.slug, 'name', v_variant.name, 'price', v_variant.price_cents, 'image', coalesce(v_variant.image, ''),
        'fulfillment', v_variant.fulfillment, 'dmin', v_variant.dispatch_min_days, 'dmax', v_variant.dispatch_max_days,
        'origin', v_variant.origin);
      p_order := jsonb_set(p_order, '{_lines}', coalesce(p_order -> '_lines', '[]'::jsonb) || v_item);
    end if;
  end loop;

  if jsonb_array_length(v_missing) > 0 then
    raise exception 'ESTOQUE_INSUFICIENTE' using detail = v_missing::text;
  end if;

  -- Cupom: avalia com o subtotal do BANCO e conta o uso só se ainda houver vaga (atômico).
  if v_code is not null then
    select * into v_coupon from public.coupons where lower(code) = lower(v_code);
    v_eval := public.coupon_evaluate(v_coupon, v_subtotal, v_shipping);
    if not (v_eval ->> 'ok')::boolean then
      raise exception 'CUPOM_INVALIDO' using detail = v_eval ->> 'reason';
    end if;
    update public.coupons set uses = uses + 1
      where id = v_coupon.id and (max_uses is null or uses < max_uses);
    if not found then raise exception 'CUPOM_INVALIDO' using detail = 'esgotado'; end if;
    v_discount := (v_eval ->> 'discount_cents')::integer;
    v_shipping_discount := least((v_eval ->> 'shipping_discount_cents')::integer, v_shipping);
  end if;

  insert into public.customers (email, name, phone)
    values (lower(p_order -> 'customer' ->> 'email'), p_order -> 'customer' ->> 'name', p_order -> 'customer' ->> 'phone')
    on conflict (email) do update set name = excluded.name, phone = coalesce(excluded.phone, public.customers.phone)
    returning id into v_customer_id;

  insert into public.orders (id, customer_id, customer_name, customer_email, customer_phone, address, shipping,
      payment_method, subtotal_cents, shipping_cents, total_cents, coupon_code, discount_cents, shipping_discount_cents)
    values (p_order ->> 'id', v_customer_id, p_order -> 'customer' ->> 'name', lower(p_order -> 'customer' ->> 'email'),
      p_order -> 'customer' ->> 'phone', p_order -> 'address', p_order -> 'shipping', p_order ->> 'payment_method',
      v_subtotal, v_shipping - v_shipping_discount, v_subtotal - v_discount + v_shipping - v_shipping_discount,
      case when v_code is null then null else v_coupon.code end, v_discount, v_shipping_discount)
    returning * into v_order;

  insert into public.order_items (order_id, product_id, sku, product_slug, name, size, image, unit_price_cents, quantity,
      fulfillment, dispatch_min_days, dispatch_max_days, origin, item_status)
    select v_order.id, (l ->> 'product_id')::uuid, l ->> 'sku', l ->> 'slug', l ->> 'name', l ->> 'size', l ->> 'image',
      (l ->> 'price')::integer, (l ->> 'quantity')::integer, l ->> 'fulfillment', (l ->> 'dmin')::integer,
      (l ->> 'dmax')::integer, l ->> 'origin',
      case when l ->> 'fulfillment' = 'sob_encomenda' then 'aguardando-compra' else 'separando' end
    from jsonb_array_elements(p_order -> '_lines') as l;

  if v_code is not null then
    insert into public.coupon_redemptions (coupon_id, order_id, discount_cents, shipping_discount_cents)
      values (v_coupon.id, v_order.id, v_discount, v_shipping_discount);
  end if;

  return v_order;
end;
$$;
revoke all on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;

-- Devolve estoque E o uso do cupom (pedido recusado/cancelado). Idempotente: só uma vez por pedido.
create or replace function public.release_order_stock(p_order_id text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set stock_released = true where id = p_order_id and stock_released = false;
  if not found then return false; end if;
  update public.product_variants pv set stock = pv.stock + i.quantity
    from public.order_items i where i.order_id = p_order_id and i.sku = pv.sku;
  update public.coupons c set uses = greatest(c.uses - 1, 0)
    from public.coupon_redemptions r where r.order_id = p_order_id and r.coupon_id = c.id and not r.released;
  update public.coupon_redemptions set released = true where order_id = p_order_id;
  return true;
end;
$$;
revoke all on function public.release_order_stock(text) from public, anon, authenticated;
grant execute on function public.release_order_stock(text) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- RLS: só admin lê e escreve (o visitante usa quote_coupon).
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
revoke all on table public.coupons, public.coupon_redemptions from anon, public;
drop policy if exists "so admin" on public.coupons;
drop policy if exists "so admin" on public.coupons;
create policy "so admin" on public.coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin le" on public.coupon_redemptions;
drop policy if exists "admin le" on public.coupon_redemptions;
create policy "admin le" on public.coupon_redemptions for select to authenticated using (public.is_admin());

-- =====================================================================================================
-- 20261027000000_consulta_e_limites.sql
-- =====================================================================================================
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

-- =====================================================================================================
-- 20261028000000_eventos_e_cancelamento.sql
-- =====================================================================================================
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
drop policy if exists "admin le" on public.order_events;
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
