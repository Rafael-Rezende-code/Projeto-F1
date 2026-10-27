-- Apex: ATUALIZAÇÃO 4 do Supabase (gerado por scripts/supabase/setup-completo.mjs; NÃO editar à mão).
-- Para o banco que JÁ ESTÁ NO AR (já recebeu o setup completo até 20261101000000 e as atualizações anteriores (2 a 3)). NÃO contém seed: não mexe em produtos
-- nem em estoque. Pode rodar mais de uma vez. Cole tudo no SQL Editor e clique em Run (docs/backend/supabase.md).
--
-- Contém, nesta ordem: 20261102000000_desconto_pix.sql, 20261103000000_kits.sql.

-- =====================================================================================================
-- 20261102000000_desconto_pix.sql
-- =====================================================================================================
-- Loja extra, item 1a: desconto no Pix. O percentual é a política da loja (NEXT_PUBLIC_PIX_DISCOUNT_PERCENT), enviado pelo
-- servidor do site em p_order.pix_percent (create_order só roda com a service role; o valor é limitado a 0–30 aqui).
-- O desconto incide sobre o subtotal depois do cupom, SEM o frete, e só quando o meio é Pix. O pedido grava o meio
-- (payment_method, já existente), o percentual e o valor do desconto. Idempotente.

alter table public.orders add column if not exists payment_discount_cents integer not null default 0;
alter table public.orders add column if not exists payment_discount_percent integer not null default 0;
do $$ begin
  alter table public.orders add constraint orders_payment_discount_check
    check (payment_discount_cents >= 0 and payment_discount_percent between 0 and 30);
exception when duplicate_object then null; end $$;

-- create_order: igual à do cupom + desconto no Pix.
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
  v_pix_percent integer := 0;
  v_pix integer := 0;
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

  -- Pix: sobre itens − cupom, sem o frete (mesma conta de lib/pricing.ts: round em centavos).
  if p_order ->> 'payment_method' = 'pix' then
    v_pix_percent := least(greatest(coalesce((p_order ->> 'pix_percent')::integer, 0), 0), 30);
    v_pix := round(greatest(v_subtotal - v_discount, 0)::numeric * v_pix_percent / 100)::integer;
  end if;

  insert into public.customers (email, name, phone)
    values (lower(p_order -> 'customer' ->> 'email'), p_order -> 'customer' ->> 'name', p_order -> 'customer' ->> 'phone')
    on conflict (email) do update set name = excluded.name, phone = coalesce(excluded.phone, public.customers.phone)
    returning id into v_customer_id;

  insert into public.orders (id, customer_id, customer_name, customer_email, customer_phone, address, shipping,
      payment_method, subtotal_cents, shipping_cents, total_cents, coupon_code, discount_cents, shipping_discount_cents,
      payment_discount_cents, payment_discount_percent)
    values (p_order ->> 'id', v_customer_id, p_order -> 'customer' ->> 'name', lower(p_order -> 'customer' ->> 'email'),
      p_order -> 'customer' ->> 'phone', p_order -> 'address', p_order -> 'shipping', p_order ->> 'payment_method',
      v_subtotal, v_shipping - v_shipping_discount, v_subtotal - v_discount - v_pix + v_shipping - v_shipping_discount,
      case when v_code is null then null else v_coupon.code end, v_discount, v_shipping_discount,
      v_pix, case when v_pix > 0 then v_pix_percent else 0 end)
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

-- =====================================================================================================
-- 20261103000000_kits.sql
-- =====================================================================================================
-- Loja extra, item 2: kits por equipe e piloto. Desconto de conjunto calculado NO BANCO ao criar o pedido, sem cupom:
-- vale para cada conjunto completo dos produtos do kit na sacola (qualquer tamanho); itens personalizados nunca entram.
-- Cupom não é cumulativo com kit, salvo pela política (p_order.coupon_with_kit). Público lê só kits ativos; o resto,
-- admin. Mesma regra de lib/pricing.ts (applyKits). Idempotente.

create table if not exists public.kits (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  team_slug text,
  driver_slug text,
  product_slugs text[] not null,
  discount_percent integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $$ begin
  alter table public.kits add constraint kits_slug_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.kits add constraint kits_products_check check (array_length(product_slugs, 1) between 2 and 6);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.kits add constraint kits_percent_check check (discount_percent between 1 and 50);
exception when duplicate_object then null; end $$;
drop trigger if exists kits_touch on public.kits;
drop trigger if exists kits_touch on public.kits;
create trigger kits_touch before update on public.kits for each row execute function public.touch_updated_at();

alter table public.kits enable row level security;
revoke all on table public.kits from anon, public;
grant select on table public.kits to anon, authenticated;
grant insert, update, delete on table public.kits to authenticated;
drop policy if exists "kits ativos publicos" on public.kits;
drop policy if exists "kits ativos publicos" on public.kits;
create policy "kits ativos publicos" on public.kits for select to anon, authenticated using (active or public.is_admin());
drop policy if exists "admin altera kits" on public.kits;
drop policy if exists "admin altera kits" on public.kits;
create policy "admin altera kits" on public.kits for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.orders add column if not exists kit_discount_cents integer not null default 0;
alter table public.orders add column if not exists kits jsonb not null default '[]'::jsonb;

-- Desconto de kits para as linhas do pedido ([{slug, price, quantity, personalization?}]). Kits de maior desconto por
-- conjunto primeiro; cada unidade entra em um kit só. Devolve {total, kits: [{slug, title, sets, discount_cents}]}.
create or replace function public.kit_discounts(p_lines jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_free jsonb := '{}'::jsonb;
  v_price jsonb := '{}'::jsonb;
  l jsonb;
  k record;
  s text;
  v_sets integer;
  v_avail integer;
  v_disc integer;
  v_total integer := 0;
  v_out jsonb := '[]'::jsonb;
begin
  for l in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) loop
    if jsonb_typeof(l -> 'personalization') = 'object' or coalesce((l ->> 'personalized')::boolean, false) then continue; end if;
    v_free := jsonb_set(v_free, array[l ->> 'slug'], to_jsonb(coalesce((v_free ->> (l ->> 'slug'))::integer, 0) + (l ->> 'quantity')::integer));
    if not v_price ? (l ->> 'slug') then
      v_price := jsonb_set(v_price, array[l ->> 'slug'], to_jsonb((l ->> 'price')::integer));
    end if;
  end loop;
  for k in
    select kt.slug, kt.title, kt.product_slugs,
      round((select coalesce(sum((v_price ->> ps)::integer), 0) from unnest(kt.product_slugs) ps)::numeric * kt.discount_percent / 100)::integer as per_set
    from public.kits kt
    where kt.active and array_length(kt.product_slugs, 1) >= 2
      and (select count(distinct ps) from unnest(kt.product_slugs) ps) = array_length(kt.product_slugs, 1)
    order by per_set desc, kt.slug
  loop
    v_sets := null;
    foreach s in array k.product_slugs loop
      v_avail := coalesce((v_free ->> s)::integer, 0);
      v_sets := least(coalesce(v_sets, v_avail), v_avail);
    end loop;
    if coalesce(v_sets, 0) <= 0 then continue; end if;
    foreach s in array k.product_slugs loop
      v_free := jsonb_set(v_free, array[s], to_jsonb((v_free ->> s)::integer - v_sets));
    end loop;
    v_disc := k.per_set * v_sets;
    v_total := v_total + v_disc;
    v_out := v_out || jsonb_build_object('slug', k.slug, 'title', k.title, 'sets', v_sets, 'discount_cents', v_disc);
  end loop;
  return jsonb_build_object('total', v_total, 'kits', v_out);
end;
$$;
revoke all on function public.kit_discounts(jsonb) from public, anon, authenticated;
grant execute on function public.kit_discounts(jsonb) to service_role;

-- create_order: igual à do desconto no Pix + kits (antes do cupom e do Pix).
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
  v_pix_percent integer := 0;
  v_pix integer := 0;
  v_kitres jsonb;
  v_kit integer := 0;
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

  -- Kits (loja extra, item 2): desconto por conjunto completo, sem itens personalizados (mesma regra de lib/pricing.ts).
  v_kitres := public.kit_discounts(p_order -> '_lines');
  v_kit := least(coalesce((v_kitres ->> 'total')::integer, 0), v_subtotal);

  if v_code is not null then
    -- Cupom e kit não são cumulativos, salvo pela política da loja (NEXT_PUBLIC_COUPON_WITH_KIT, vinda do servidor).
    if v_kit > 0 and not coalesce((p_order ->> 'coupon_with_kit')::boolean, false) then
      raise exception 'CUPOM_INVALIDO' using detail = 'com_kit';
    end if;
    select * into v_coupon from public.coupons where lower(code) = lower(v_code);
    v_eval := public.coupon_evaluate(v_coupon, v_subtotal - v_kit, v_shipping);
    if not (v_eval ->> 'ok')::boolean then
      raise exception 'CUPOM_INVALIDO' using detail = v_eval ->> 'reason';
    end if;
    update public.coupons set uses = uses + 1
      where id = v_coupon.id and (max_uses is null or uses < max_uses);
    if not found then raise exception 'CUPOM_INVALIDO' using detail = 'esgotado'; end if;
    v_discount := (v_eval ->> 'discount_cents')::integer;
    v_shipping_discount := least((v_eval ->> 'shipping_discount_cents')::integer, v_shipping);
  end if;

  -- Pix: sobre itens − kit − cupom, sem o frete (mesma conta de lib/pricing.ts: round em centavos).
  if p_order ->> 'payment_method' = 'pix' then
    v_pix_percent := least(greatest(coalesce((p_order ->> 'pix_percent')::integer, 0), 0), 30);
    v_pix := round(greatest(v_subtotal - v_kit - v_discount, 0)::numeric * v_pix_percent / 100)::integer;
  end if;

  insert into public.customers (email, name, phone)
    values (lower(p_order -> 'customer' ->> 'email'), p_order -> 'customer' ->> 'name', p_order -> 'customer' ->> 'phone')
    on conflict (email) do update set name = excluded.name, phone = coalesce(excluded.phone, public.customers.phone)
    returning id into v_customer_id;

  insert into public.orders (id, customer_id, customer_name, customer_email, customer_phone, address, shipping,
      payment_method, subtotal_cents, shipping_cents, total_cents, coupon_code, discount_cents, shipping_discount_cents,
      payment_discount_cents, payment_discount_percent, kit_discount_cents, kits)
    values (p_order ->> 'id', v_customer_id, p_order -> 'customer' ->> 'name', lower(p_order -> 'customer' ->> 'email'),
      p_order -> 'customer' ->> 'phone', p_order -> 'address', p_order -> 'shipping', p_order ->> 'payment_method',
      v_subtotal, v_shipping - v_shipping_discount, v_subtotal - v_kit - v_discount - v_pix + v_shipping - v_shipping_discount,
      case when v_code is null then null else v_coupon.code end, v_discount, v_shipping_discount,
      v_pix, case when v_pix > 0 then v_pix_percent else 0 end, v_kit, coalesce(v_kitres -> 'kits', '[]'::jsonb))
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
