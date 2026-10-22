-- Modelo de venda (refino 2, item 5): estoque próprio x sob encomenda, prazos, origem, pacote para frete, dados
-- PRIVADOS do produto (só admin) e status por item do pedido. Não altera a migração anterior: só acrescenta.
-- Explicação do fluxo em docs/operacao/modelo-de-venda.md.

-- ---------------------------------------------------------------------------------------------------------------------
-- Campos PÚBLICOS do produto (aparecem na loja).
alter table public.products
  add column fulfillment text not null default 'estoque_proprio' check (fulfillment in ('estoque_proprio', 'sob_encomenda')),
  add column dispatch_min_days integer not null default 1 check (dispatch_min_days >= 0),
  add column dispatch_max_days integer not null default 3,
  add column origin text not null default 'nacional' check (origin in ('nacional', 'importado')),
  add column weight_grams integer check (weight_grams is null or weight_grams > 0),
  add column length_cm numeric(6, 1) check (length_cm is null or length_cm > 0),
  add column width_cm numeric(6, 1) check (width_cm is null or width_cm > 0),
  add column height_cm numeric(6, 1) check (height_cm is null or height_cm > 0),
  add constraint products_dispatch_range check (dispatch_max_days >= dispatch_min_days and dispatch_max_days <= 120);

-- ---------------------------------------------------------------------------------------------------------------------
-- Dados PRIVADOS do produto: custo, frete do fornecedor, link do fornecedor e notas. Tabela separada para que nenhuma
-- consulta pública ("select *" em products) os traga. RLS: só administradores leem e escrevem; o papel anon nem tem
-- permissão na tabela (defesa em profundidade, além do RLS).
create table public.product_private (
  product_id uuid primary key references public.products (id) on delete cascade,
  cost_cents integer check (cost_cents is null or cost_cents >= 0),
  supplier_shipping_cents integer check (supplier_shipping_cents is null or supplier_shipping_cents >= 0),
  supplier_url text,
  notes text not null default '',
  updated_at timestamptz not null default now()
);
create trigger product_private_touch before update on public.product_private for each row execute function public.touch_updated_at();
alter table public.product_private enable row level security;
revoke all on table public.product_private from anon, public;
create policy "so admin" on public.product_private for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------------------------------------------------
-- Itens do pedido: modelo de venda copiado do produto no momento da compra, status por item e rastreios.
--   separando          estoque próprio, ainda não enviado
--   aguardando-compra  sob encomenda, falta comprar no fornecedor
--   comprado           comprado no fornecedor (supplier_tracking_code: rastreio do fornecedor até a loja/cliente)
--   enviado            a caminho do cliente (tracking_code: rastreio até o cliente)
--   entregue
alter table public.order_items
  add column fulfillment text not null default 'estoque_proprio' check (fulfillment in ('estoque_proprio', 'sob_encomenda')),
  add column dispatch_min_days integer not null default 1,
  add column dispatch_max_days integer not null default 3,
  add column origin text not null default 'nacional' check (origin in ('nacional', 'importado')),
  add column item_status text not null default 'separando'
    check (item_status in ('separando', 'aguardando-compra', 'comprado', 'enviado', 'entregue')),
  add column supplier_tracking_code text,
  add column purchased_at timestamptz,
  add column tracking_code text,
  add column shipped_at timestamptz,
  add column delivered_at timestamptz;
create index order_items_status_idx on public.order_items (item_status);

create policy "admin atualiza" on public.order_items for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------------------------------------------------
-- create_order: igual à da migração anterior, mas cada item leva o modelo de venda do produto e começa em
-- "separando" (estoque próprio) ou "aguardando-compra" (sob encomenda). Sob encomenda também baixa o estoque: nesse
-- caso o "estoque" é quantas unidades a loja aceita encomendar (o admin define).
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

  insert into public.customers (email, name, phone)
    values (lower(p_order -> 'customer' ->> 'email'), p_order -> 'customer' ->> 'name', p_order -> 'customer' ->> 'phone')
    on conflict (email) do update set name = excluded.name, phone = coalesce(excluded.phone, public.customers.phone)
    returning id into v_customer_id;

  insert into public.orders (id, customer_id, customer_name, customer_email, customer_phone, address, shipping,
      payment_method, subtotal_cents, shipping_cents, total_cents)
    values (p_order ->> 'id', v_customer_id, p_order -> 'customer' ->> 'name', lower(p_order -> 'customer' ->> 'email'),
      p_order -> 'customer' ->> 'phone', p_order -> 'address', p_order -> 'shipping', p_order ->> 'payment_method',
      v_subtotal, v_shipping, v_subtotal + v_shipping)
    returning * into v_order;

  insert into public.order_items (order_id, product_id, sku, product_slug, name, size, image, unit_price_cents, quantity,
      fulfillment, dispatch_min_days, dispatch_max_days, origin, item_status)
    select v_order.id, (l ->> 'product_id')::uuid, l ->> 'sku', l ->> 'slug', l ->> 'name', l ->> 'size', l ->> 'image',
      (l ->> 'price')::integer, (l ->> 'quantity')::integer, l ->> 'fulfillment', (l ->> 'dmin')::integer,
      (l ->> 'dmax')::integer, l ->> 'origin',
      case when l ->> 'fulfillment' = 'sob_encomenda' then 'aguardando-compra' else 'separando' end
    from jsonb_array_elements(p_order -> '_lines') as l;

  return v_order;
end;
$$;

revoke all on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;
