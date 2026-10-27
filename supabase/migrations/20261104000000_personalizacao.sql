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
