-- Apex: ATUALIZAÇÃO 2 do Supabase (gerado por scripts/supabase/setup-completo.mjs; NÃO editar à mão).
-- Para o banco que JÁ ESTÁ NO AR (já recebeu o setup completo até 20261025000000). NÃO contém seed: não mexe em produtos
-- nem em estoque. Pode rodar mais de uma vez. Cole tudo no SQL Editor e clique em Run (docs/backend/supabase.md).
--
-- Contém, nesta ordem: 20261026000000_cupons.sql.

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
