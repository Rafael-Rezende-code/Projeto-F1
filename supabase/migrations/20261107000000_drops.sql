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
create trigger drops_touch before update on public.drops for each row execute function public.touch_updated_at();

alter table public.drops enable row level security;
revoke all on table public.drops from anon, public;
grant select on table public.drops to anon, authenticated;
grant insert, update, delete on table public.drops to authenticated;
drop policy if exists "drops ativos publicos" on public.drops;
create policy "drops ativos publicos" on public.drops for select to anon, authenticated using (active or public.is_admin());
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
create policy "lista de espera publica" on public.drop_waitlist for insert to anon, authenticated
  with check (consent = true and public.drop_waitlist_allowed(drop_id));
drop policy if exists "admin le lista de espera" on public.drop_waitlist;
create policy "admin le lista de espera" on public.drop_waitlist for select to authenticated using (public.is_admin());
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
