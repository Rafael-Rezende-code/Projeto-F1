-- Apex: ATUALIZAÇÃO 4 do Supabase (gerado por scripts/supabase/setup-completo.mjs; NÃO editar à mão).
-- Para o banco que JÁ ESTÁ NO AR (já recebeu o setup completo até 20261101000000 e as atualizações anteriores (2 a 3)). NÃO contém seed: não mexe em produtos
-- nem em estoque. Pode rodar mais de uma vez. Cole tudo no SQL Editor e clique em Run (docs/backend/supabase.md).
--
-- Contém, nesta ordem: 20261102000000_desconto_pix.sql, 20261103000000_kits.sql, 20261104000000_personalizacao.sql, 20261105000000_listas.sql, 20261106000000_corridas.sql, 20261107000000_drops.sql.

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

-- =====================================================================================================
-- 20261104000000_personalizacao.sql
-- =====================================================================================================
-- Loja extra, item 3: camisa personalizada (nome e número). Configuração por produto (pública: o cliente precisa dos
-- limites para o formulário), personalização gravada por item do pedido (jsonb) com o adicional; create_order valida o
-- formato e a faixa e soma o adicional NO BANCO. A lista de palavras bloqueadas fica no servidor do site
-- (lib/personalization-blocklist.ts), antes de chegar aqui. Idempotente.

alter table public.products add column if not exists personalizable boolean not null default false;
alter table public.products add column if not exists personalization_fee_cents integer not null default 0;
alter table public.products add column if not exists personalization_max_name integer not null default 12;
alter table public.products add column if not exists personalization_number_min integer not null default 0;
alter table public.products add column if not exists personalization_number_max integer not null default 99;
-- Opcional: foto das costas da galeria com o texto posicionado por porcentagens ({src, nameTop, numberTop, color}).
alter table public.products add column if not exists personalization_back jsonb;
do $$ begin
  alter table public.products add constraint products_personalization_check check (
    personalization_fee_cents >= 0 and personalization_max_name between 1 and 20
    and personalization_number_min >= 0 and personalization_number_max <= 999
    and personalization_number_min <= personalization_number_max);
exception when duplicate_object then null; end $$;

alter table public.order_items add column if not exists personalization jsonb;
alter table public.order_items add column if not exists personalization_fee_cents integer not null default 0;

-- create_order: igual à dos kits + personalização por item.
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
  v_pers jsonb;
  v_fee integer;
  v_pname text;
  v_pnum text;
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
        p.dispatch_max_days, p.origin, p.personalizable, p.personalization_fee_cents,
        p.personalization_max_name, p.personalization_number_min, p.personalization_number_max,
        (select src from public.product_images i where i.product_id = p.id order by position limit 1) as image
      into v_variant;
    if not found then
      v_missing := v_missing || jsonb_build_object('sku', v_item ->> 'sku',
        'available', coalesce((select stock from public.product_variants where sku = v_item ->> 'sku'), 0));
    else
      -- Personalização (loja extra, item 3): nome em maiúsculas (A–Z, 0–9, espaço, hífen) até o limite do produto e
      -- número na faixa; o adicional é somado por unidade. Produto não personalizável ou valor fora da regra: nada é gravado.
      v_pers := null;
      v_fee := 0;
      if jsonb_typeof(v_item -> 'personalization') = 'object' then
        if not v_variant.personalizable then raise exception 'PERSONALIZACAO_INVALIDA' using detail = v_item ->> 'sku'; end if;
        v_pname := coalesce(v_item -> 'personalization' ->> 'name', '');
        v_pnum := nullif(coalesce(v_item -> 'personalization' ->> 'number', ''), '');
        if v_pname <> '' and v_pname !~ '^[A-Z0-9]([A-Z0-9 -]*[A-Z0-9])?$' then
          raise exception 'PERSONALIZACAO_INVALIDA' using detail = v_item ->> 'sku';
        end if;
        if length(v_pname) > v_variant.personalization_max_name or (v_pname = '' and v_pnum is null) then
          raise exception 'PERSONALIZACAO_INVALIDA' using detail = v_item ->> 'sku';
        end if;
        if v_pnum is not null and (v_pnum !~ '^[0-9]{1,3}$' or v_pnum::integer < v_variant.personalization_number_min
            or v_pnum::integer > v_variant.personalization_number_max) then
          raise exception 'PERSONALIZACAO_INVALIDA' using detail = v_item ->> 'sku';
        end if;
        v_pers := jsonb_build_object('name', nullif(v_pname, ''), 'number', v_pnum);
        v_fee := v_variant.personalization_fee_cents;
      end if;
      v_subtotal := v_subtotal + (v_variant.price_cents + v_fee) * v_qty;
      v_item := v_item || jsonb_build_object('product_id', v_variant.product_id, 'size', v_variant.size,
        'slug', v_variant.slug, 'name', v_variant.name, 'price', v_variant.price_cents, 'image', coalesce(v_variant.image, ''),
        'fulfillment', v_variant.fulfillment, 'dmin', v_variant.dispatch_min_days, 'dmax', v_variant.dispatch_max_days,
        'origin', v_variant.origin, 'fee', v_fee, 'personalization', coalesce(v_pers, 'null'::jsonb));
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
      fulfillment, dispatch_min_days, dispatch_max_days, origin, item_status, personalization, personalization_fee_cents)
    select v_order.id, (l ->> 'product_id')::uuid, l ->> 'sku', l ->> 'slug', l ->> 'name', l ->> 'size', l ->> 'image',
      (l ->> 'price')::integer, (l ->> 'quantity')::integer, l ->> 'fulfillment', (l ->> 'dmin')::integer,
      (l ->> 'dmax')::integer, l ->> 'origin',
      case when l ->> 'fulfillment' = 'sob_encomenda' then 'aguardando-compra' else 'separando' end,
      case when jsonb_typeof(l -> 'personalization') = 'object' then l -> 'personalization' end, coalesce((l ->> 'fee')::integer, 0)
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

-- Importador: igual ao da curadoria + colunas de personalização.
create or replace function public.import_products(p_items jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  v_item jsonb;
  v_id uuid;
  v_existed boolean;
  v_owner text;
  v_skus text[];
  v_private jsonb;
  v_result jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then raise exception 'SEM_PERMISSAO'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'IMPORTACAO_VAZIA'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_id := (select id from public.products where slug = v_item ->> 'slug');
    v_existed := v_id is not null;
    if v_existed then
      update public.products set
        name = v_item ->> 'name', description = v_item ->> 'description', category_slug = v_item ->> 'category_slug',
        team_slug = nullif(v_item ->> 'team_slug', ''), driver_slug = nullif(v_item ->> 'driver_slug', ''),
        price_cents = (v_item ->> 'price_cents')::integer, compare_at_price_cents = (v_item ->> 'compare_at_price_cents')::integer,
        tags = coalesce((select array_agg(t) from jsonb_array_elements_text(v_item -> 'tags') t), '{}'),
        status = v_item ->> 'status', illustrative = false,
        fulfillment = v_item ->> 'fulfillment', dispatch_min_days = (v_item ->> 'dispatch_min_days')::integer,
        dispatch_max_days = (v_item ->> 'dispatch_max_days')::integer, origin = v_item ->> 'origin',
        weight_grams = (v_item ->> 'weight_grams')::integer, length_cm = (v_item ->> 'length_cm')::numeric,
        width_cm = (v_item ->> 'width_cm')::numeric, height_cm = (v_item ->> 'height_cm')::numeric,
        featured = case when v_item ? 'featured' then (v_item ->> 'featured')::boolean else featured end,
        bestseller_manual = case when v_item ? 'bestseller_manual' then (v_item ->> 'bestseller_manual')::boolean else bestseller_manual end,
        bestseller_rank = case when v_item ? 'bestseller_rank' then (v_item ->> 'bestseller_rank')::integer else bestseller_rank end,
        new_until = case when v_item ? 'new_until' then (v_item ->> 'new_until')::date else new_until end
      where id = v_id;
    else
      insert into public.products (slug, name, description, details, details_pending, category_slug, team_slug, driver_slug,
          price_cents, compare_at_price_cents, tags, status, illustrative, position, fulfillment, dispatch_min_days,
          dispatch_max_days, origin, weight_grams, length_cm, width_cm, height_cm, featured, bestseller_manual,
          bestseller_rank, new_until)
        values (v_item ->> 'slug', v_item ->> 'name', v_item ->> 'description', '[]', false, v_item ->> 'category_slug',
          nullif(v_item ->> 'team_slug', ''), nullif(v_item ->> 'driver_slug', ''), (v_item ->> 'price_cents')::integer,
          (v_item ->> 'compare_at_price_cents')::integer,
          coalesce((select array_agg(t) from jsonb_array_elements_text(v_item -> 'tags') t), '{}'),
          v_item ->> 'status', false, 1000, v_item ->> 'fulfillment', (v_item ->> 'dispatch_min_days')::integer,
          (v_item ->> 'dispatch_max_days')::integer, v_item ->> 'origin', (v_item ->> 'weight_grams')::integer,
          (v_item ->> 'length_cm')::numeric, (v_item ->> 'width_cm')::numeric, (v_item ->> 'height_cm')::numeric,
          coalesce((v_item ->> 'featured')::boolean, false), coalesce((v_item ->> 'bestseller_manual')::boolean, false),
          (v_item ->> 'bestseller_rank')::integer, (v_item ->> 'new_until')::date)
        returning id into v_id;
    end if;

    -- Personalização (loja extra, item 3): coluna ausente na planilha mantém o valor atual.
    update public.products set
      personalizable = case when v_item ? 'personalizable' then (v_item ->> 'personalizable')::boolean else personalizable end,
      personalization_fee_cents = case when v_item ? 'personalization_fee_cents' then (v_item ->> 'personalization_fee_cents')::integer else personalization_fee_cents end,
      personalization_max_name = case when v_item ? 'personalization_max_name' then (v_item ->> 'personalization_max_name')::integer else personalization_max_name end,
      personalization_number_min = case when v_item ? 'personalization_number_min' then (v_item ->> 'personalization_number_min')::integer else personalization_number_min end,
      personalization_number_max = case when v_item ? 'personalization_number_max' then (v_item ->> 'personalization_number_max')::integer else personalization_number_max end
    where id = v_id;

    -- Variantes: SKU de OUTRO produto é erro (nada é gravado); as que saíram da planilha são removidas.
    v_skus := array(select x ->> 'sku' from jsonb_array_elements(v_item -> 'variants') x);
    if coalesce(array_length(v_skus, 1), 0) = 0 then raise exception 'SEM_TAMANHOS' using detail = v_item ->> 'slug'; end if;
    select p.slug into v_owner from public.product_variants pv join public.products p on p.id = pv.product_id
      where pv.sku = any (v_skus) and pv.product_id <> v_id limit 1;
    if v_owner is not null then raise exception 'SKU_DE_OUTRO_PRODUTO' using detail = v_owner; end if;
    insert into public.product_variants (sku, product_id, size, stock, position)
      select x ->> 'sku', v_id, x ->> 'size', (x ->> 'stock')::integer, (n - 1)::integer
      from jsonb_array_elements(v_item -> 'variants') with ordinality as t(x, n)
      on conflict (sku) do update set size = excluded.size, stock = excluded.stock, position = excluded.position;
    delete from public.product_variants where product_id = v_id and sku <> all (v_skus);

    -- Fotos: só quando a planilha trouxe (lista nova substitui; os arquivos do Storage ficam).
    if jsonb_typeof(v_item -> 'images') = 'array' then
      delete from public.product_images where product_id = v_id;
      insert into public.product_images (product_id, src, alt, storage_path, illustrative, position)
        select v_id, x ->> 'src', coalesce(nullif(x ->> 'alt', ''), v_item ->> 'name'), x ->> 'storage_path', false, (n - 1)::integer
        from jsonb_array_elements(v_item -> 'images') with ordinality as t(x, n);
    end if;

    -- Dados PRIVADOS (product_private): campo ausente mantém o valor atual.
    v_private := v_item -> 'private';
    if jsonb_typeof(v_private) = 'object' and v_private <> '{}'::jsonb then
      insert into public.product_private as pp (product_id, cost_cents, supplier_shipping_cents, supplier_url, notes)
        values (v_id, (v_private ->> 'cost_cents')::integer, (v_private ->> 'supplier_shipping_cents')::integer,
          v_private ->> 'supplier_url', coalesce(v_private ->> 'notes', ''))
        on conflict (product_id) do update set
          cost_cents = case when v_private ? 'cost_cents' then excluded.cost_cents else pp.cost_cents end,
          supplier_shipping_cents = case when v_private ? 'supplier_shipping_cents' then excluded.supplier_shipping_cents else pp.supplier_shipping_cents end,
          supplier_url = case when v_private ? 'supplier_url' then excluded.supplier_url else pp.supplier_url end,
          notes = case when v_private ? 'notes' then excluded.notes else pp.notes end;
    end if;

    v_result := v_result || jsonb_build_object('slug', v_item ->> 'slug', 'id', v_id, 'action', case when v_existed then 'atualizado' else 'criado' end);
  end loop;
  return v_result;
end;
$$;

revoke all on function public.import_products(jsonb) from public, anon;
grant execute on function public.import_products(jsonb) to authenticated;

-- Consulta de pedido: + personalização de cada item (nome e número escolhidos).
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
        'item_status', i.item_status, 'tracking_code', i.tracking_code, 'personalization', i.personalization
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
-- 20261105000000_listas.sql
-- =====================================================================================================
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
drop trigger if exists wishlists_touch on public.wishlists;
create trigger wishlists_touch before update on public.wishlists for each row execute function public.touch_updated_at();

alter table public.wishlists enable row level security;
revoke all on table public.wishlists from anon, authenticated, public;
grant select on table public.wishlists to authenticated;
drop policy if exists "admin le listas" on public.wishlists;
drop policy if exists "admin le listas" on public.wishlists;
create policy "admin le listas" on public.wishlists for select to authenticated using (public.is_admin());

-- =====================================================================================================
-- 20261106000000_corridas.sql
-- =====================================================================================================
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
drop trigger if exists race_weekends_touch on public.race_weekends;
create trigger race_weekends_touch before update on public.race_weekends for each row execute function public.touch_updated_at();

alter table public.race_weekends enable row level security;
revoke all on table public.race_weekends from anon, public;
grant select on table public.race_weekends to anon, authenticated;
grant insert, update, delete on table public.race_weekends to authenticated;
drop policy if exists "corridas ativas publicas" on public.race_weekends;
drop policy if exists "corridas ativas publicas" on public.race_weekends;
create policy "corridas ativas publicas" on public.race_weekends for select to anon, authenticated using (active or public.is_admin());
drop policy if exists "admin altera corridas" on public.race_weekends;
drop policy if exists "admin altera corridas" on public.race_weekends;
create policy "admin altera corridas" on public.race_weekends for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================================================
-- 20261107000000_drops.sql
-- =====================================================================================================
-- Loja extra, item 6: drops e pré-venda. Drop = produtos com data de lançamento (horário de Brasília no painel), modo
-- lançamento ou pré-venda, previsão de envio e limite por pedido. Antes da data o produto não é vendável: a create_order
-- recusa (DROP_NAO_LIBERADO) e também acima do limite por pedido (DROP_LIMITE), na mesma transação da baixa de estoque.
-- Lista de espera: inserção pública limitada (consentimento, honeypot e limite por IP no servidor; limite por IP e global
-- aqui), leitura só admin. Avisos enviados ficam em drop_notifications (um por e-mail e drop: reenviar não duplica).
-- Público lê só drops ativos. Idempotente.

create table if not exists public.drops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  cover text,
  launch_at timestamptz not null,
  mode text not null default 'lancamento',
  ship_estimate text,
  per_order_limit integer,
  product_slugs text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $$ begin
  alter table public.drops add constraint drops_check check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60 and mode in ('lancamento', 'pre_venda')
    and (per_order_limit is null or per_order_limit between 1 and 99) and coalesce(array_length(product_slugs, 1), 0) <= 40
    and (cover is null or cover ~ '^(https://|/)'));
exception when duplicate_object then null; end $$;
drop trigger if exists drops_touch on public.drops;
drop trigger if exists drops_touch on public.drops;
create trigger drops_touch before update on public.drops for each row execute function public.touch_updated_at();

alter table public.drops enable row level security;
revoke all on table public.drops from anon, public;
grant select on table public.drops to anon, authenticated;
grant insert, update, delete on table public.drops to authenticated;
drop policy if exists "drops ativos publicos" on public.drops;
drop policy if exists "drops ativos publicos" on public.drops;
create policy "drops ativos publicos" on public.drops for select to anon, authenticated using (active or public.is_admin());
drop policy if exists "admin altera drops" on public.drops;
drop policy if exists "admin altera drops" on public.drops;
create policy "admin altera drops" on public.drops for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.drop_waitlist (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) between 5 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  consent boolean not null check (consent),
  consent_text text not null check (char_length(consent_text) between 10 and 600),
  ip_hash text check (ip_hash is null or char_length(ip_hash) between 16 and 128),
  created_at timestamptz not null default now(),
  unique (drop_id, email)
);
create index if not exists drop_waitlist_ip_idx on public.drop_waitlist (ip_hash, created_at);

create or replace function public.drop_waitlist_limits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.ip_hash is not null
     and (select count(*) from public.drop_waitlist where ip_hash = new.ip_hash and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'LIMITE_POR_IP';
  end if;
  if (select count(*) from public.drop_waitlist where created_at > now() - interval '1 hour') >= 500 then
    raise exception 'LIMITE_GLOBAL';
  end if;
  return new;
end;
$$;
drop trigger if exists drop_waitlist_limits on public.drop_waitlist;
drop trigger if exists drop_waitlist_limits on public.drop_waitlist;
create trigger drop_waitlist_limits before insert on public.drop_waitlist for each row execute function public.drop_waitlist_limits();

create or replace function public.drop_waitlist_allowed(p_drop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.drops where id = p_drop and active);
$$;
revoke all on function public.drop_waitlist_allowed(uuid) from public;
grant execute on function public.drop_waitlist_allowed(uuid) to anon, authenticated, service_role;

alter table public.drop_waitlist enable row level security;
revoke all on table public.drop_waitlist from anon, authenticated, public;
grant insert (drop_id, email, consent, consent_text, ip_hash) on public.drop_waitlist to anon, authenticated;
grant select, delete on public.drop_waitlist to authenticated;
drop policy if exists "lista de espera publica" on public.drop_waitlist;
drop policy if exists "lista de espera publica" on public.drop_waitlist;
create policy "lista de espera publica" on public.drop_waitlist for insert to anon, authenticated
  with check (consent = true and public.drop_waitlist_allowed(drop_id));
drop policy if exists "admin le lista de espera" on public.drop_waitlist;
drop policy if exists "admin le lista de espera" on public.drop_waitlist;
create policy "admin le lista de espera" on public.drop_waitlist for select to authenticated using (public.is_admin());
drop policy if exists "admin apaga lista de espera" on public.drop_waitlist;
drop policy if exists "admin apaga lista de espera" on public.drop_waitlist;
create policy "admin apaga lista de espera" on public.drop_waitlist for delete to authenticated using (public.is_admin());

create table if not exists public.drop_notifications (
  drop_id uuid not null references public.drops (id) on delete cascade,
  email text not null,
  status text not null default 'pendente' check (status in ('pendente', 'enviado', 'falhou')),
  attempts integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (drop_id, email)
);
alter table public.drop_notifications enable row level security;
revoke all on table public.drop_notifications from anon, public;
grant select, insert, update on table public.drop_notifications to authenticated;
drop policy if exists "admin avisos de drop" on public.drop_notifications;
drop policy if exists "admin avisos de drop" on public.drop_notifications;
create policy "admin avisos de drop" on public.drop_notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- create_order: igual à da personalização + liberação e limite dos drops.
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
  v_pers jsonb;
  v_fee integer;
  v_pname text;
  v_pnum text;
  v_drop record;
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
        p.dispatch_max_days, p.origin, p.personalizable, p.personalization_fee_cents,
        p.personalization_max_name, p.personalization_number_min, p.personalization_number_max,
        (select src from public.product_images i where i.product_id = p.id order by position limit 1) as image
      into v_variant;
    if not found then
      v_missing := v_missing || jsonb_build_object('sku', v_item ->> 'sku',
        'available', coalesce((select stock from public.product_variants where sku = v_item ->> 'sku'), 0));
    else
      -- Personalização (loja extra, item 3): nome em maiúsculas (A–Z, 0–9, espaço, hífen) até o limite do produto e
      -- número na faixa; o adicional é somado por unidade. Produto não personalizável ou valor fora da regra: nada é gravado.
      v_pers := null;
      v_fee := 0;
      if jsonb_typeof(v_item -> 'personalization') = 'object' then
        if not v_variant.personalizable then raise exception 'PERSONALIZACAO_INVALIDA' using detail = v_item ->> 'sku'; end if;
        v_pname := coalesce(v_item -> 'personalization' ->> 'name', '');
        v_pnum := nullif(coalesce(v_item -> 'personalization' ->> 'number', ''), '');
        if v_pname <> '' and v_pname !~ '^[A-Z0-9]([A-Z0-9 -]*[A-Z0-9])?$' then
          raise exception 'PERSONALIZACAO_INVALIDA' using detail = v_item ->> 'sku';
        end if;
        if length(v_pname) > v_variant.personalization_max_name or (v_pname = '' and v_pnum is null) then
          raise exception 'PERSONALIZACAO_INVALIDA' using detail = v_item ->> 'sku';
        end if;
        if v_pnum is not null and (v_pnum !~ '^[0-9]{1,3}$' or v_pnum::integer < v_variant.personalization_number_min
            or v_pnum::integer > v_variant.personalization_number_max) then
          raise exception 'PERSONALIZACAO_INVALIDA' using detail = v_item ->> 'sku';
        end if;
        v_pers := jsonb_build_object('name', nullif(v_pname, ''), 'number', v_pnum);
        v_fee := v_variant.personalization_fee_cents;
      end if;
      v_subtotal := v_subtotal + (v_variant.price_cents + v_fee) * v_qty;
      v_item := v_item || jsonb_build_object('product_id', v_variant.product_id, 'size', v_variant.size,
        'slug', v_variant.slug, 'name', v_variant.name, 'price', v_variant.price_cents, 'image', coalesce(v_variant.image, ''),
        'fulfillment', v_variant.fulfillment, 'dmin', v_variant.dispatch_min_days, 'dmax', v_variant.dispatch_max_days,
        'origin', v_variant.origin, 'fee', v_fee, 'personalization', coalesce(v_pers, 'null'::jsonb));
      p_order := jsonb_set(p_order, '{_lines}', coalesce(p_order -> '_lines', '[]'::jsonb) || v_item);
    end if;
  end loop;

  if jsonb_array_length(v_missing) > 0 then
    raise exception 'ESTOQUE_INSUFICIENTE' using detail = v_missing::text;
  end if;

  -- Drops (loja extra, item 6): peça de drop ativo só vende a partir do lançamento, e no máximo o limite por pedido
  -- (somando as peças do mesmo drop). Recusa → nada é gravado (o estoque baixado acima volta com a transação).
  for v_drop in
    select d.slug, d.launch_at, d.per_order_limit,
      (select coalesce(sum((l ->> 'quantity')::integer), 0) from jsonb_array_elements(p_order -> '_lines') l
        where (l ->> 'slug') = any (d.product_slugs)) as qty
    from public.drops d
    where d.active and exists (select 1 from jsonb_array_elements(p_order -> '_lines') l where (l ->> 'slug') = any (d.product_slugs))
  loop
    if now() < v_drop.launch_at then raise exception 'DROP_NAO_LIBERADO' using detail = v_drop.slug; end if;
    if v_drop.per_order_limit is not null and v_drop.qty > v_drop.per_order_limit then
      raise exception 'DROP_LIMITE' using detail = v_drop.slug;
    end if;
  end loop;

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
      fulfillment, dispatch_min_days, dispatch_max_days, origin, item_status, personalization, personalization_fee_cents)
    select v_order.id, (l ->> 'product_id')::uuid, l ->> 'sku', l ->> 'slug', l ->> 'name', l ->> 'size', l ->> 'image',
      (l ->> 'price')::integer, (l ->> 'quantity')::integer, l ->> 'fulfillment', (l ->> 'dmin')::integer,
      (l ->> 'dmax')::integer, l ->> 'origin',
      case when l ->> 'fulfillment' = 'sob_encomenda' then 'aguardando-compra' else 'separando' end,
      case when jsonb_typeof(l -> 'personalization') = 'object' then l -> 'personalization' end, coalesce((l ->> 'fee')::integer, 0)
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
