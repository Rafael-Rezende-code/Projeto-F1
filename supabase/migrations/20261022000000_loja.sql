-- Loja Apex: catálogo, pedidos e administração (fase 9 da rodada de backend).
-- Rode com a Supabase CLI (`supabase db push`) ou cole no SQL Editor do painel. Passo a passo em docs/backend/supabase.md.
--
-- Regras:
-- * Preços SEMPRE em centavos (integer), como em lib/catalog/types.ts.
-- * RLS ligado em todas as tabelas: o catálogo ativo é público para leitura; escrita só para administradores
--   (e-mails da tabela admin_emails, conferidos pelo JWT do Supabase Auth). Pedidos e clientes não têm acesso público:
--   o servidor do site usa a service role (que ignora RLS) e o painel admin lê pelo papel de administrador.
-- * Baixa de estoque só pela função create_order (transação única, UPDATE condicional por SKU: nunca vende acima do
--   estoque, mesmo com compras simultâneas). Devolução de estoque pela release_order_stock (idempotente).

-- gen_random_uuid() é nativo do Postgres 13+ (sem extensão).

-- ---------------------------------------------------------------------------------------------------------------------
-- Administradores
create table public.admin_emails (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_emails where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- updated_at automático
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Catálogo
create table public.categories (
  slug text primary key,
  name text not null,
  description text not null default '',
  image text not null default '',
  position integer not null default 0
);

create table public.teams (
  slug text primary key,
  name text not null,
  tagline text not null default '',
  color text not null,
  brand_color text not null,
  -- { src, width, height, displayHeight } (mesma forma de Team.logo)
  logo jsonb not null,
  position integer not null default 0
);

create table public.drivers (
  slug text primary key,
  name text not null,
  team_slug text not null references public.teams (slug) on update cascade,
  number integer,
  phrase text not null default '',
  image text not null default '',
  position integer not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text unique,                       -- código legível (APX-001)
  slug text not null unique,
  name text not null,
  description text not null default '',   -- parágrafos separados por linha em branco
  details jsonb not null default '[]',    -- [{ label, value }]
  details_pending boolean not null default true,
  price_cents integer not null check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents > price_cents),
  category_slug text not null references public.categories (slug) on update cascade,
  team_slug text references public.teams (slug) on update cascade,
  driver_slug text references public.drivers (slug) on update cascade,
  tags text[] not null default '{}',
  is_new boolean not null default false,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  illustrative boolean not null default false,
  position integer not null default 0,    -- ordem de "relevância"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_slug);
create index products_team_idx on public.products (team_slug);
create index products_driver_idx on public.products (driver_slug);
create index products_status_idx on public.products (status, position);
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

create table public.product_variants (
  sku text primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null,
  color text,
  stock integer not null default 0 check (stock >= 0),
  position integer not null default 0
);
create index product_variants_product_idx on public.product_variants (product_id, position);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  src text not null,
  alt text not null default '',
  illustrative boolean not null default false,
  storage_path text,                      -- caminho no bucket "produtos" quando enviada pelo admin
  position integer not null default 0
);
create index product_images_product_idx on public.product_images (product_id, position);

-- ---------------------------------------------------------------------------------------------------------------------
-- Clientes e pedidos (só o necessário para entregar e atender)
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id text primary key,                    -- APX-XXXXXXX-XXXX (lib/checkout/order.ts)
  access_token uuid not null default gen_random_uuid(), -- link do cliente para /pedido/[id]?t=...
  customer_id uuid not null references public.customers (id),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  address jsonb not null,
  shipping jsonb not null,                -- { id, label, days, priceCents }
  status text not null default 'aguardando-pagamento'
    check (status in ('aguardando-pagamento', 'pago', 'recusado', 'cancelado', 'enviado', 'entregue')),
  payment_method text not null check (payment_method in ('pix', 'cartao', 'boleto')),
  payment_provider text,
  payment_reference text,
  payment_status text,                    -- status bruto do provedor (approved, pending, rejected...)
  payment_details jsonb not null default '{}', -- QR do Pix, link do boleto, bandeira/últimos 4 do cartão
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  stock_released boolean not null default false,
  tracking_code text,
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_payment_reference_idx on public.orders (payment_reference);
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  sku text not null,
  product_slug text not null,
  name text not null,
  size text not null,
  image text not null default '',
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- Notificações de pagamento já processadas (idempotência do webhook).
create table public.payment_events (
  id text primary key,                    -- provedor + id da notificação
  order_id text references public.orders (id) on delete set null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------------------------------
-- Pedido com baixa de estoque transacional.
-- p_order: { id, customer: { name, email, phone }, address, shipping: { id, label, days, priceCents },
--            payment_method, items: [{ sku, quantity }] }
-- Preço de cada item vem do BANCO (não do cliente). Se algum SKU não tiver estoque, nada é gravado e a função levanta
-- 'ESTOQUE_INSUFICIENTE' com os SKUs em DETAIL (JSON: [{ sku, available }]).
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

  -- 1) Baixa condicional de cada SKU (trava a linha; quem chegar depois vê o estoque já baixado).
  for v_item in select * from jsonb_array_elements(p_order -> 'items') loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then raise exception 'QUANTIDADE_INVALIDA'; end if;
    update public.product_variants pv
      set stock = pv.stock - v_qty
      from public.products p
      where pv.sku = v_item ->> 'sku' and p.id = pv.product_id and p.status = 'active' and pv.stock >= v_qty
      returning pv.sku, pv.product_id, pv.size, p.slug, p.name, p.price_cents,
        (select src from public.product_images i where i.product_id = p.id order by position limit 1) as image
      into v_variant;
    if not found then
      v_missing := v_missing || jsonb_build_object('sku', v_item ->> 'sku',
        'available', coalesce((select stock from public.product_variants where sku = v_item ->> 'sku'), 0));
    else
      v_subtotal := v_subtotal + v_variant.price_cents * v_qty;
      -- guarda a linha para inserir depois do pedido
      v_item := v_item || jsonb_build_object('product_id', v_variant.product_id, 'size', v_variant.size,
        'slug', v_variant.slug, 'name', v_variant.name, 'price', v_variant.price_cents, 'image', coalesce(v_variant.image, ''));
      p_order := jsonb_set(p_order, '{_lines}', coalesce(p_order -> '_lines', '[]'::jsonb) || v_item);
    end if;
  end loop;

  if jsonb_array_length(v_missing) > 0 then
    -- desfaz as baixas já feitas nesta transação
    raise exception 'ESTOQUE_INSUFICIENTE' using detail = v_missing::text;
  end if;

  -- 2) Cliente (um por e-mail)
  insert into public.customers (email, name, phone)
    values (lower(p_order -> 'customer' ->> 'email'), p_order -> 'customer' ->> 'name', p_order -> 'customer' ->> 'phone')
    on conflict (email) do update set name = excluded.name, phone = coalesce(excluded.phone, public.customers.phone)
    returning id into v_customer_id;

  -- 3) Pedido e itens
  insert into public.orders (id, customer_id, customer_name, customer_email, customer_phone, address, shipping,
      payment_method, subtotal_cents, shipping_cents, total_cents)
    values (p_order ->> 'id', v_customer_id, p_order -> 'customer' ->> 'name', lower(p_order -> 'customer' ->> 'email'),
      p_order -> 'customer' ->> 'phone', p_order -> 'address', p_order -> 'shipping', p_order ->> 'payment_method',
      v_subtotal, v_shipping, v_subtotal + v_shipping)
    returning * into v_order;

  insert into public.order_items (order_id, product_id, sku, product_slug, name, size, image, unit_price_cents, quantity)
    select v_order.id, (l ->> 'product_id')::uuid, l ->> 'sku', l ->> 'slug', l ->> 'name', l ->> 'size', l ->> 'image',
      (l ->> 'price')::integer, (l ->> 'quantity')::integer
    from jsonb_array_elements(p_order -> '_lines') as l;

  return v_order;
end;
$$;

-- Devolve o estoque de um pedido (pagamento recusado, expirado ou cancelado). Idempotente: só devolve uma vez.
create or replace function public.release_order_stock(p_order_id text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set stock_released = true where id = p_order_id and stock_released = false;
  if not found then return false; end if;
  update public.product_variants pv set stock = pv.stock + i.quantity
    from public.order_items i where i.order_id = p_order_id and i.sku = pv.sku;
  return true;
end;
$$;

-- Só o servidor (service role) cria pedidos e devolve estoque.
revoke all on function public.create_order(jsonb) from public, anon, authenticated;
revoke all on function public.release_order_stock(text) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;
grant execute on function public.release_order_stock(text) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- RLS
alter table public.admin_emails enable row level security;
alter table public.categories enable row level security;
alter table public.teams enable row level security;
alter table public.drivers enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;

create policy "admins leem a lista de admins" on public.admin_emails for select to authenticated using (public.is_admin());

-- Catálogo: leitura pública; escrita só admin.
create policy "leitura publica" on public.categories for select using (true);
create policy "admin escreve" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "leitura publica" on public.teams for select using (true);
create policy "admin escreve" on public.teams for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "leitura publica" on public.drivers for select using (true);
create policy "admin escreve" on public.drivers for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "leitura publica dos ativos" on public.products for select using (status = 'active' or public.is_admin());
create policy "admin escreve" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "leitura publica dos ativos" on public.product_variants for select
  using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
create policy "admin escreve" on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "leitura publica dos ativos" on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
create policy "admin escreve" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pedidos e clientes: sem acesso público. Admin lê e atualiza (marcar como enviado); criação só pela create_order.
create policy "admin le" on public.customers for select to authenticated using (public.is_admin());
create policy "admin le" on public.orders for select to authenticated using (public.is_admin());
create policy "admin atualiza" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin le" on public.order_items for select to authenticated using (public.is_admin());
-- payment_events: nenhuma política (só service role).

-- ---------------------------------------------------------------------------------------------------------------------
-- Storage: fotos de produto enviadas pelo admin (bucket público para leitura).
insert into storage.buckets (id, name, public) values ('produtos', 'produtos', true) on conflict (id) do nothing;
create policy "fotos de produto: leitura publica" on storage.objects for select using (bucket_id = 'produtos');
create policy "fotos de produto: admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'produtos' and public.is_admin());
create policy "fotos de produto: admin altera" on storage.objects for update to authenticated
  using (bucket_id = 'produtos' and public.is_admin());
create policy "fotos de produto: admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'produtos' and public.is_admin());
