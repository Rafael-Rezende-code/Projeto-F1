-- Apex: ATUALIZAÇÃO 4 do Supabase (gerado por scripts/supabase/setup-completo.mjs; NÃO editar à mão).
-- Para o banco que JÁ ESTÁ NO AR (já recebeu o setup completo até 20261101000000 e as atualizações anteriores (2 a 3)). NÃO contém seed: não mexe em produtos
-- nem em estoque. Pode rodar mais de uma vez. Cole tudo no SQL Editor e clique em Run (docs/backend/supabase.md).
--
-- Contém, nesta ordem: 20261102000000_desconto_pix.sql.

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
