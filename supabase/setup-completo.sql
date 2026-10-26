-- Apex: SETUP COMPLETO do Supabase (gerado por scripts/supabase/setup-completo.mjs; NÃO editar à mão).
--
-- !!! Contém o seed de demonstração: reaplicar repõe produtos de teste e estoque. NÃO rode de novo depois de cadastrar produtos reais.
-- !!! Banco que já está no ar: use as atualizações (supabase/atualizacao-N.sql, só as migrations novas, sem seed), em ordem.
--
-- Cole tudo no SQL Editor do projeto e clique em Run. Passo a passo em docs/backend/supabase.md.
--
-- Contém, nesta ordem: 20261022000000_loja.sql, 20261023000000_modelo_de_venda.sql, 20261024000000_importador.sql, 20261025000000_newsletter.sql, 20261026000000_cupons.sql, 20261027000000_consulta_e_limites.sql, 20261028000000_eventos_e_cancelamento.sql, 20261029000000_emails.sql, 20261030000000_curadoria.sql, 20261031000000_avise_me.sql, 20261101000000_avaliacoes.sql e o seed do catálogo (supabase/seed.sql).
-- Pode rodar de novo: tabelas, índices, colunas, políticas e gatilhos são recriados só se faltarem, e o seed atualiza
-- o que já existe. ATENÇÃO: rodar de novo devolve o ESTOQUE dos produtos do seed aos valores de exemplo; depois que a
-- loja estiver vendendo, rode só as migrations novas.
--
-- No fim, troque o e-mail de exemplo pelo seu (é quem pode entrar no /admin; também vai em ADMIN_EMAILS na Vercel).

-- =====================================================================================================
-- 20261022000000_loja.sql
-- =====================================================================================================
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
create table if not exists public.admin_emails (
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
create table if not exists public.categories (
  slug text primary key,
  name text not null,
  description text not null default '',
  image text not null default '',
  position integer not null default 0
);

create table if not exists public.teams (
  slug text primary key,
  name text not null,
  tagline text not null default '',
  color text not null,
  brand_color text not null,
  -- { src, width, height, displayHeight } (mesma forma de Team.logo)
  logo jsonb not null,
  position integer not null default 0
);

create table if not exists public.drivers (
  slug text primary key,
  name text not null,
  team_slug text not null references public.teams (slug) on update cascade,
  number integer,
  phrase text not null default '',
  image text not null default '',
  position integer not null default 0
);

create table if not exists public.products (
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
create index if not exists products_category_idx on public.products (category_slug);
create index if not exists products_team_idx on public.products (team_slug);
create index if not exists products_driver_idx on public.products (driver_slug);
create index if not exists products_status_idx on public.products (status, position);
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

create table if not exists public.product_variants (
  sku text primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null,
  color text,
  stock integer not null default 0 check (stock >= 0),
  position integer not null default 0
);
create index if not exists product_variants_product_idx on public.product_variants (product_id, position);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  src text not null,
  alt text not null default '',
  illustrative boolean not null default false,
  storage_path text,                      -- caminho no bucket "produtos" quando enviada pelo admin
  position integer not null default 0
);
create index if not exists product_images_product_idx on public.product_images (product_id, position);

-- ---------------------------------------------------------------------------------------------------------------------
-- Clientes e pedidos (só o necessário para entregar e atender)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
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
create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists orders_payment_reference_idx on public.orders (payment_reference);
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

create table if not exists public.order_items (
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
create index if not exists order_items_order_idx on public.order_items (order_id);

-- Notificações de pagamento já processadas (idempotência do webhook).
create table if not exists public.payment_events (
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

drop policy if exists "admins leem a lista de admins" on public.admin_emails;
create policy "admins leem a lista de admins" on public.admin_emails for select to authenticated using (public.is_admin());

-- Catálogo: leitura pública; escrita só admin.
drop policy if exists "leitura publica" on public.categories;
create policy "leitura publica" on public.categories for select using (true);
drop policy if exists "admin escreve" on public.categories;
create policy "admin escreve" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "leitura publica" on public.teams;
create policy "leitura publica" on public.teams for select using (true);
drop policy if exists "admin escreve" on public.teams;
create policy "admin escreve" on public.teams for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "leitura publica" on public.drivers;
create policy "leitura publica" on public.drivers for select using (true);
drop policy if exists "admin escreve" on public.drivers;
create policy "admin escreve" on public.drivers for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "leitura publica dos ativos" on public.products;
create policy "leitura publica dos ativos" on public.products for select using (status = 'active' or public.is_admin());
drop policy if exists "admin escreve" on public.products;
create policy "admin escreve" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "leitura publica dos ativos" on public.product_variants;
create policy "leitura publica dos ativos" on public.product_variants for select
  using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
drop policy if exists "admin escreve" on public.product_variants;
create policy "admin escreve" on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "leitura publica dos ativos" on public.product_images;
create policy "leitura publica dos ativos" on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
drop policy if exists "admin escreve" on public.product_images;
create policy "admin escreve" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pedidos e clientes: sem acesso público. Admin lê e atualiza (marcar como enviado); criação só pela create_order.
drop policy if exists "admin le" on public.customers;
create policy "admin le" on public.customers for select to authenticated using (public.is_admin());
drop policy if exists "admin le" on public.orders;
create policy "admin le" on public.orders for select to authenticated using (public.is_admin());
drop policy if exists "admin atualiza" on public.orders;
create policy "admin atualiza" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin le" on public.order_items;
create policy "admin le" on public.order_items for select to authenticated using (public.is_admin());
-- payment_events: nenhuma política (só service role).

-- ---------------------------------------------------------------------------------------------------------------------
-- Storage: fotos de produto enviadas pelo admin (bucket público para leitura).
insert into storage.buckets (id, name, public) values ('produtos', 'produtos', true) on conflict (id) do nothing;
drop policy if exists "fotos de produto: leitura publica" on storage.objects;
create policy "fotos de produto: leitura publica" on storage.objects for select using (bucket_id = 'produtos');
drop policy if exists "fotos de produto: admin envia" on storage.objects;
create policy "fotos de produto: admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'produtos' and public.is_admin());
drop policy if exists "fotos de produto: admin altera" on storage.objects;
create policy "fotos de produto: admin altera" on storage.objects for update to authenticated
  using (bucket_id = 'produtos' and public.is_admin());
drop policy if exists "fotos de produto: admin apaga" on storage.objects;
create policy "fotos de produto: admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'produtos' and public.is_admin());

-- =====================================================================================================
-- 20261023000000_modelo_de_venda.sql
-- =====================================================================================================
-- Modelo de venda (refino 2, item 5): estoque próprio x sob encomenda, prazos, origem, pacote para frete, dados
-- PRIVADOS do produto (só admin) e status por item do pedido. Não altera a migração anterior: só acrescenta.
-- Explicação do fluxo em docs/operacao/modelo-de-venda.md.

-- ---------------------------------------------------------------------------------------------------------------------
-- Campos PÚBLICOS do produto (aparecem na loja).
alter table public.products
  add column if not exists fulfillment text not null default 'estoque_proprio' check (fulfillment in ('estoque_proprio', 'sob_encomenda')),
  add column if not exists dispatch_min_days integer not null default 1 check (dispatch_min_days >= 0),
  add column if not exists dispatch_max_days integer not null default 3,
  add column if not exists origin text not null default 'nacional' check (origin in ('nacional', 'importado')),
  add column if not exists weight_grams integer check (weight_grams is null or weight_grams > 0),
  add column if not exists length_cm numeric(6, 1) check (length_cm is null or length_cm > 0),
  add column if not exists width_cm numeric(6, 1) check (width_cm is null or width_cm > 0),
  add column if not exists height_cm numeric(6, 1) check (height_cm is null or height_cm > 0);
do $$ begin
  alter table public.products add constraint products_dispatch_range check (dispatch_max_days >= dispatch_min_days and dispatch_max_days <= 120);
exception when duplicate_object or duplicate_table then null;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Dados PRIVADOS do produto: custo, frete do fornecedor, link do fornecedor e notas. Tabela separada para que nenhuma
-- consulta pública ("select *" em products) os traga. RLS: só administradores leem e escrevem; o papel anon nem tem
-- permissão na tabela (defesa em profundidade, além do RLS).
create table if not exists public.product_private (
  product_id uuid primary key references public.products (id) on delete cascade,
  cost_cents integer check (cost_cents is null or cost_cents >= 0),
  supplier_shipping_cents integer check (supplier_shipping_cents is null or supplier_shipping_cents >= 0),
  supplier_url text,
  notes text not null default '',
  updated_at timestamptz not null default now()
);
drop trigger if exists product_private_touch on public.product_private;
create trigger product_private_touch before update on public.product_private for each row execute function public.touch_updated_at();
alter table public.product_private enable row level security;
revoke all on table public.product_private from anon, public;
drop policy if exists "so admin" on public.product_private;
create policy "so admin" on public.product_private for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------------------------------------------------
-- Itens do pedido: modelo de venda copiado do produto no momento da compra, status por item e rastreios.
--   separando          estoque próprio, ainda não enviado
--   aguardando-compra  sob encomenda, falta comprar no fornecedor
--   comprado           comprado no fornecedor (supplier_tracking_code: rastreio do fornecedor até a loja/cliente)
--   enviado            a caminho do cliente (tracking_code: rastreio até o cliente)
--   entregue
alter table public.order_items
  add column if not exists fulfillment text not null default 'estoque_proprio' check (fulfillment in ('estoque_proprio', 'sob_encomenda')),
  add column if not exists dispatch_min_days integer not null default 1,
  add column if not exists dispatch_max_days integer not null default 3,
  add column if not exists origin text not null default 'nacional' check (origin in ('nacional', 'importado')),
  add column if not exists item_status text not null default 'separando'
    check (item_status in ('separando', 'aguardando-compra', 'comprado', 'enviado', 'entregue')),
  add column if not exists supplier_tracking_code text,
  add column if not exists purchased_at timestamptz,
  add column if not exists tracking_code text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz;
create index if not exists order_items_status_idx on public.order_items (item_status);

drop policy if exists "admin atualiza" on public.order_items;
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

-- =====================================================================================================
-- 20261024000000_importador.sql
-- =====================================================================================================
-- Importador de produtos por CSV (lançamento, item 3). Uma chamada = UMA transação: se qualquer produto falhar, nada é
-- gravado. Chamada pelo painel com a sessão do administrador (security invoker: o RLS vale e is_admin() é conferido).
--
-- p_items: [{ slug, name, description, category_slug, team_slug, driver_slug, price_cents, compare_at_price_cents,
--             tags[], status, fulfillment, dispatch_min_days, dispatch_max_days, origin, weight_grams, length_cm,
--             width_cm, height_cm,
--             variants: [{ sku, size, stock }],
--             images: [{ src, alt, storage_path }] | null      (null = mantém as fotos atuais),
--             private: { cost_cents?, supplier_shipping_cents?, supplier_url?, notes? } | null }]
--             (campo ausente em private = mantém o valor atual)
-- Slug que já existe = ATUALIZA o produto. Devolve [{ slug, id, action: "criado" | "atualizado" }].
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
        width_cm = (v_item ->> 'width_cm')::numeric, height_cm = (v_item ->> 'height_cm')::numeric
      where id = v_id;
    else
      insert into public.products (slug, name, description, details, details_pending, category_slug, team_slug, driver_slug,
          price_cents, compare_at_price_cents, tags, status, illustrative, position, fulfillment, dispatch_min_days,
          dispatch_max_days, origin, weight_grams, length_cm, width_cm, height_cm)
        values (v_item ->> 'slug', v_item ->> 'name', v_item ->> 'description', '[]', false, v_item ->> 'category_slug',
          nullif(v_item ->> 'team_slug', ''), nullif(v_item ->> 'driver_slug', ''), (v_item ->> 'price_cents')::integer,
          (v_item ->> 'compare_at_price_cents')::integer,
          coalesce((select array_agg(t) from jsonb_array_elements_text(v_item -> 'tags') t), '{}'),
          v_item ->> 'status', false, 1000, v_item ->> 'fulfillment', (v_item ->> 'dispatch_min_days')::integer,
          (v_item ->> 'dispatch_max_days')::integer, v_item ->> 'origin', (v_item ->> 'weight_grams')::integer,
          (v_item ->> 'length_cm')::numeric, (v_item ->> 'width_cm')::numeric, (v_item ->> 'height_cm')::numeric)
        returning id into v_id;
    end if;

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

-- =====================================================================================================
-- 20261025000000_newsletter.sql
-- =====================================================================================================
-- Newsletter (feat/carros, item 3): e-mails de quem se inscreveu na seção "Fique no grid" da home.
--
-- Inscrição PÚBLICA E LIMITADA: a chave pública (anon) só consegue INSERIR, e só as 5 colunas abaixo; não lê, não altera,
-- não apaga. O CONSENTIMENTO é obrigatório (check) e o texto exato que o visitante viu fica gravado junto (consent_text).
-- Limites no próprio banco (gatilho): no máximo 5 inscrições por IP (hash) por hora e 300 no total por hora. O IP nunca é
-- guardado: o servidor grava só um hash com sal (ip_hash). Leitura, edição e exclusão: só administradores (RLS + is_admin()).
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) between 5 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  consent boolean not null check (consent),
  consent_text text not null check (char_length(consent_text) between 10 and 600),
  source text not null default 'site' check (char_length(source) between 1 and 40),
  ip_hash text check (ip_hash is null or char_length(ip_hash) between 16 and 128),
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);
create index if not exists newsletter_ip_idx on public.newsletter_subscribers (ip_hash, created_at);

-- Limites por hora (security definer: o gatilho precisa contar linhas que o visitante não pode ler).
create or replace function public.newsletter_limits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.ip_hash is not null
     and (select count(*) from public.newsletter_subscribers where ip_hash = new.ip_hash and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'LIMITE_POR_IP';
  end if;
  if (select count(*) from public.newsletter_subscribers where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'LIMITE_GLOBAL';
  end if;
  return new;
end;
$$;
drop trigger if exists newsletter_limits on public.newsletter_subscribers;
create trigger newsletter_limits before insert on public.newsletter_subscribers for each row execute function public.newsletter_limits();

alter table public.newsletter_subscribers enable row level security;

-- Permissões de coluna: o visitante só insere (e só estas colunas: não escolhe id, data nem descadastro).
revoke all on table public.newsletter_subscribers from anon, authenticated, public;
grant insert (email, consent, consent_text, source, ip_hash) on public.newsletter_subscribers to anon, authenticated;
grant select, update, delete on public.newsletter_subscribers to authenticated;

drop policy if exists "inscricao publica" on public.newsletter_subscribers;
create policy "inscricao publica" on public.newsletter_subscribers for insert to anon, authenticated
  with check (consent = true and unsubscribed_at is null);
drop policy if exists "admin le" on public.newsletter_subscribers;
create policy "admin le" on public.newsletter_subscribers for select to authenticated using (public.is_admin());
drop policy if exists "admin altera" on public.newsletter_subscribers;
create policy "admin altera" on public.newsletter_subscribers for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin apaga" on public.newsletter_subscribers;
create policy "admin apaga" on public.newsletter_subscribers for delete to authenticated using (public.is_admin());

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

-- =====================================================================================================
-- 20261029000000_emails.sql
-- =====================================================================================================
-- E-mails transacionais (operação, fase 3): registro idempotente. Um e-mail de cada tipo por pedido (único em pedido +
-- tipo): o webhook pode chegar duas vezes, o checkout e o webhook podem disparar juntos, e mesmo assim sai um só.
--   claim_order_email(pedido, tipo)  → true só para quem "pegou" o envio (linha nova, ou falha anterior com < 5 tentativas)
--   finish_order_email(...)          → marca enviado ou falhou
-- Só o servidor (service_role) executa; admin lê o registro (RLS). O conteúdo do e-mail NÃO é guardado.

create table if not exists public.email_log (
  id bigint generated always as identity primary key,
  order_id text not null references public.orders (id) on delete cascade,
  type text not null check (type in ('pedido-recebido', 'pagamento-aprovado', 'enviado', 'cancelado')),
  status text not null default 'enviando' check (status in ('enviando', 'enviado', 'falhou')),
  attempts integer not null default 1,
  provider text,
  provider_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, type)
);
alter table public.email_log enable row level security;
revoke all on table public.email_log from anon, public;
grant select on table public.email_log to authenticated;
drop policy if exists "admin le" on public.email_log;
create policy "admin le" on public.email_log for select to authenticated using (public.is_admin());

create or replace function public.claim_order_email(p_order_id text, p_type text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into public.email_log (order_id, type) values (p_order_id, p_type) on conflict (order_id, type) do nothing;
  if found then
    return true;
  end if;
  -- já existe: só tenta de novo se a última falhou (e com teto de tentativas); "enviando" travado há mais de 10 min
  -- (processo que caiu no meio) também pode ser retomado.
  update public.email_log set status = 'enviando', attempts = attempts + 1, error = null, updated_at = now()
    where order_id = p_order_id and type = p_type and attempts < 5
      and (status = 'falhou' or (status = 'enviando' and updated_at < now() - interval '10 minutes'));
  return found;
end;
$$;
revoke all on function public.claim_order_email(text, text) from public, anon, authenticated;
grant execute on function public.claim_order_email(text, text) to service_role;

create or replace function public.finish_order_email(p_order_id text, p_type text, p_ok boolean, p_provider text, p_provider_id text, p_error text)
returns void
language sql security definer set search_path = public as $$
  update public.email_log
    set status = case when p_ok then 'enviado' else 'falhou' end, provider = p_provider, provider_id = p_provider_id,
        error = left(p_error, 300), updated_at = now()
    where order_id = p_order_id and type = p_type;
$$;
revoke all on function public.finish_order_email(text, text, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.finish_order_email(text, text, boolean, text, text, text) to service_role;

-- =====================================================================================================
-- 20261030000000_curadoria.sql
-- =====================================================================================================
-- Curadoria da vitrine (refino 3, itens 1.2 e 1.3). Idempotente pelo gerador (add column if not exists / create or replace).
--
-- 1) Campos de curadoria em products (públicos, como o resto da linha de produto):
--    featured (já existia), bestseller_manual (entra em "Mais vendidos" por escolha da loja), bestseller_rank (ordem
--    entre os manuais; vazio = depois dos numerados) e new_until (data: "NOVO" até esse dia, além do is_new).
-- 2) bestseller_slugs(dias, limite): os produtos ATIVOS mais vendidos em pedidos pagos (pago, enviado, entregue) dos
--    últimos N dias, sem pedidos de teste. Devolve SÓ o slug e a posição: nenhuma quantidade sai do banco (a loja não
--    exibe contagens de vendas). Pode ser chamada com a chave pública (security definer, leitura agregada).
-- 3) import_products recriada com as colunas de curadoria (featured, mais_vendido, ordem_mais_vendido, novo_ate):
--    campo ausente no item = mantém o valor atual (atualização) ou o padrão (criação).

alter table public.products
  add column if not exists bestseller_manual boolean not null default false,
  add column if not exists bestseller_rank integer check (bestseller_rank is null or (bestseller_rank between 1 and 9999)),
  add column if not exists new_until date;

create index if not exists products_bestseller_idx on public.products (bestseller_rank) where bestseller_manual;

create or replace function public.bestseller_slugs(p_days integer default 90, p_limit integer default 8)
returns table (slug text, place integer)
language sql stable security definer set search_path = public as $$
  select ranked.slug, (row_number() over (order by ranked.quantity desc, ranked.slug))::integer as place
  from (
    select p.slug, sum(i.quantity) as quantity
    from public.order_items i
    join public.orders o on o.id = i.order_id
    join public.products p on p.slug = i.product_slug
    where o.status in ('pago', 'enviado', 'entregue')
      and not coalesce(o.is_test, false)
      and o.created_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 90), 1), 365))
      and p.status = 'active'
    group by p.slug
  ) ranked
  order by ranked.quantity desc, ranked.slug
  limit least(greatest(coalesce(p_limit, 8), 1), 24);
$$;
revoke all on function public.bestseller_slugs(integer, integer) from public;
grant execute on function public.bestseller_slugs(integer, integer) to anon, authenticated, service_role;

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

-- =====================================================================================================
-- 20261031000000_avise_me.sql
-- =====================================================================================================
-- "Avise-me quando chegar" (refino 3, item 2.4): e-mails de quem quer saber quando um TAMANHO ESGOTADO voltar.
--
-- Inscrição PÚBLICA E LIMITADA (mesmo padrão da newsletter): a chave pública (anon) só INSERE, só nas 5 colunas abaixo,
-- só com consentimento e só para uma variante que existe, está publicada e está com estoque 0. Não lê, não altera, não
-- apaga. Um e-mail por variante (o repetido não grava de novo). Limite por IP no servidor (lib/rate-limit.ts, balde
-- "avise-me") e aqui no banco (gatilho: 10 por IP por hora e 300 no total por hora; o IP só entra como hash com sal).
-- Leitura, edição (marcar como avisado) e exclusão: só administradores (RLS + is_admin()). O envio do aviso é manual
-- (lista e CSV em /admin/avise-me); não há e-mail automático.
create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and char_length(email) between 5 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  sku text not null references public.product_variants (sku) on update cascade on delete cascade,
  consent boolean not null check (consent),
  consent_text text not null check (char_length(consent_text) between 10 and 600),
  ip_hash text check (ip_hash is null or char_length(ip_hash) between 16 and 128),
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (email, sku)
);
create index if not exists stock_alerts_sku_idx on public.stock_alerts (sku, created_at);
create index if not exists stock_alerts_ip_idx on public.stock_alerts (ip_hash, created_at);

create or replace function public.stock_alert_limits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.ip_hash is not null
     and (select count(*) from public.stock_alerts where ip_hash = new.ip_hash and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'LIMITE_POR_IP';
  end if;
  if (select count(*) from public.stock_alerts where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'LIMITE_GLOBAL';
  end if;
  return new;
end;
$$;
drop trigger if exists stock_alert_limits on public.stock_alerts;
create trigger stock_alert_limits before insert on public.stock_alerts for each row execute function public.stock_alert_limits();

-- A variante pode receber aviso? (existe, produto publicado, estoque 0). security definer: a política do visitante
-- consulta o catálogo sem depender das permissões dele.
create or replace function public.stock_alert_allowed(p_sku text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.product_variants v join public.products p on p.id = v.product_id
    where v.sku = p_sku and v.stock = 0 and p.status = 'active'
  );
$$;
revoke all on function public.stock_alert_allowed(text) from public;
grant execute on function public.stock_alert_allowed(text) to anon, authenticated, service_role;

alter table public.stock_alerts enable row level security;

revoke all on table public.stock_alerts from anon, authenticated, public;
grant insert (email, sku, consent, consent_text, ip_hash) on public.stock_alerts to anon, authenticated;
grant select, update, delete on public.stock_alerts to authenticated;

drop policy if exists "aviso publico" on public.stock_alerts;
create policy "aviso publico" on public.stock_alerts for insert to anon, authenticated
  with check (consent = true and notified_at is null and public.stock_alert_allowed(sku));
drop policy if exists "admin le avisos" on public.stock_alerts;
create policy "admin le avisos" on public.stock_alerts for select to authenticated using (public.is_admin());
drop policy if exists "admin altera avisos" on public.stock_alerts;
create policy "admin altera avisos" on public.stock_alerts for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin apaga avisos" on public.stock_alerts;
create policy "admin apaga avisos" on public.stock_alerts for delete to authenticated using (public.is_admin());

-- =====================================================================================================
-- 20261101000000_avaliacoes.sql
-- =====================================================================================================
-- Avaliações de produto (refino 3, item 2.5). DESLIGADAS no site por padrão (NEXT_PUBLIC_REVIEWS_ENABLED). Nenhum dado de
-- exemplo é criado aqui (nem no seed).
--
-- Quem avalia: o cliente de um pedido ENTREGUE, pela consulta de pedido (/pedido/consultar: número + e-mail), uma
-- avaliação por produto do pedido. A gravação passa SÓ pela função submit_review (service role, chamada pelo servidor
-- depois do limite por IP), que confere pedido + e-mail + status + produto e grava como PENDENTE.
-- Quem lê: o público só vê as APROVADAS e só as colunas de exibição (sem pedido nem moderação). Moderação (aprovar ou
-- rejeitar) e leitura completa: só administradores (RLS + is_admin()).
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null references public.products (slug) on update cascade on delete cascade,
  order_id text not null references public.orders (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text not null check (char_length(title) between 2 and 80),
  body text not null check (char_length(body) between 10 and 2000),
  display_name text not null check (char_length(display_name) between 2 and 40),
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by text,
  unique (order_id, product_slug)
);
create index if not exists reviews_product_idx on public.reviews (product_slug, status, created_at desc);
create index if not exists reviews_status_idx on public.reviews (status, created_at);

alter table public.reviews enable row level security;
revoke all on table public.reviews from anon, authenticated, public;
-- Público (chave anon, sem login): só as colunas de exibição. Logado (authenticated) só lê pelo RLS de administrador.
grant select (id, product_slug, rating, title, body, display_name, created_at, status) on public.reviews to anon;
grant select, update, delete on public.reviews to authenticated;

drop policy if exists "avaliacoes aprovadas sao publicas" on public.reviews;
create policy "avaliacoes aprovadas sao publicas" on public.reviews for select to anon using (status = 'aprovada');
drop policy if exists "admin le avaliacoes" on public.reviews;
create policy "admin le avaliacoes" on public.reviews for select to authenticated using (public.is_admin());
drop policy if exists "admin modera avaliacoes" on public.reviews;
create policy "admin modera avaliacoes" on public.reviews for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin apaga avaliacoes" on public.reviews;
create policy "admin apaga avaliacoes" on public.reviews for delete to authenticated using (public.is_admin());

-- Moderação: quem e quando (e-mail do JWT do administrador).
create or replace function public.reviews_moderation_stamp() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status is distinct from old.status then
    new.moderated_at := now();
    new.moderated_by := coalesce(auth.jwt() ->> 'email', 'sistema');
  end if;
  return new;
end;
$$;
drop trigger if exists reviews_moderation_stamp on public.reviews;
create trigger reviews_moderation_stamp before update on public.reviews for each row execute function public.reviews_moderation_stamp();

-- Envio pelo cliente. Devolve 'ok', 'nao_encontrado' (pedido/e-mail não conferem: a mesma resposta para os dois),
-- 'nao_entregue', 'produto_fora_do_pedido' ou 'ja_avaliado'.
create or replace function public.submit_review(p_order_id text, p_email text, p_product_slug text, p_rating integer, p_title text, p_body text, p_display_name text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  select status into v_status from public.orders where id = upper(trim(p_order_id)) and customer_email = lower(trim(p_email));
  if v_status is null then return 'nao_encontrado'; end if;
  if v_status <> 'entregue' then return 'nao_entregue'; end if;
  if not exists (select 1 from public.order_items where order_id = upper(trim(p_order_id)) and product_slug = p_product_slug) then
    return 'produto_fora_do_pedido';
  end if;
  insert into public.reviews (product_slug, order_id, rating, title, body, display_name)
    values (p_product_slug, upper(trim(p_order_id)), p_rating, trim(p_title), trim(p_body), trim(p_display_name));
  return 'ok';
exception when unique_violation then
  return 'ja_avaliado';
end;
$$;
revoke all on function public.submit_review(text, text, text, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_review(text, text, text, integer, text, text, text) to service_role;

-- Quais produtos do pedido já foram avaliados (para a consulta de pedido esconder o formulário). Só service role.
create or replace function public.reviewed_products(p_order_id text, p_email text) returns setof text
language sql stable security definer set search_path = public as $$
  select r.product_slug from public.reviews r join public.orders o on o.id = r.order_id
  where o.id = upper(trim(p_order_id)) and o.customer_email = lower(trim(p_email));
$$;
revoke all on function public.reviewed_products(text, text) from public, anon, authenticated;
grant execute on function public.reviewed_products(text, text) to service_role;

-- =====================================================================================================
-- seed.sql (catálogo de demonstração)
-- =====================================================================================================
-- Gerado por scripts/supabase/seed.ts a partir de lib/catalog/seed/. Não editar à mão.
begin;
insert into public.categories (slug, name, description, image, position) values
  ('teamwear', 'Teamwear', 'Represente sua equipe.', 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 0),
  ('racing', 'Racing', 'Feito para a velocidade.', 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 1),
  ('colecionaveis', 'Colecionáveis', 'Guarde a memória.', 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=85', 2),
  ('acessorios', 'Acessórios', 'Leve o grid com você.', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 3)
on conflict (slug) do update set name = excluded.name, description = excluded.description, image = excluded.image, position = excluded.position;

insert into public.teams (slug, name, tagline, color, brand_color, logo, position) values
  ('ferrari', 'Ferrari', 'O vermelho mais famoso do grid.', '#DC0000', '#DC0000', '{"src":"/images/logos-equipes/ferrari.webp","width":271,"height":59,"displayHeight":25}'::jsonb, 0),
  ('mercedes', 'Mercedes', 'Prata, preto e precisão alemã.', '#00A19C', '#00A19C', '{"src":"/images/logos-equipes/mercedes.webp","width":348,"height":108,"displayHeight":44}'::jsonb, 1),
  ('mclaren', 'McLaren', 'Papaya de Woking para o mundo.', '#E77400', '#FF8000', '{"src":"/images/logos-equipes/mclaren.webp","width":375,"height":96,"displayHeight":32}'::jsonb, 2),
  ('red-bull-racing', 'Red Bull Racing', 'Asas para quem acelera.', '#121F45', '#121F45', '{"src":"/images/logos-equipes/red-bull.webp","width":423,"height":69,"displayHeight":23}'::jsonb, 3),
  ('aston-martin', 'Aston Martin', 'O verde britânico de corrida.', '#00594F', '#00594F', '{"src":"/images/logos-equipes/aston-martin.webp","width":201,"height":135,"displayHeight":45}'::jsonb, 4),
  ('williams', 'Williams', 'Uma das grandes famílias da F1.', '#005AFF', '#005AFF', '{"src":"/images/logos-equipes/williams.webp","width":292,"height":150,"displayHeight":50}'::jsonb, 5),
  ('alpine', 'Alpine', 'Azul francês em ritmo de corrida.', '#0090FF', '#0090FF', '{"src":"/images/logos-equipes/alpine.webp","width":162,"height":132,"displayHeight":44}'::jsonb, 6),
  ('haas', 'Haas', 'A equipe americana do grid.', '#DA291C', '#DA291C', '{"src":"/images/logos-equipes/haas.webp","width":301,"height":99,"displayHeight":33}'::jsonb, 7),
  ('racing-bulls', 'Racing Bulls', 'A escola de talentos de Faenza.', '#1634CB', '#1634CB', '{"src":"/images/logos-equipes/racing-bulls.webp","width":152,"height":126,"displayHeight":42}'::jsonb, 8),
  ('audi', 'Audi', 'Quatro argolas no grid.', '#BB0A30', '#BB0A30', '{"src":"/images/logos-equipes/audi.webp","width":163,"height":150,"displayHeight":50}'::jsonb, 9),
  ('cadillac', 'Cadillac', 'A estreia americana na F1.', '#111111', '#111111', '{"src":"/images/logos-equipes/cadillac.webp","width":266,"height":135,"displayHeight":56}'::jsonb, 10)
on conflict (slug) do update set name = excluded.name, tagline = excluded.tagline, color = excluded.color, brand_color = excluded.brand_color, logo = excluded.logo, position = excluded.position;

insert into public.drivers (slug, name, team_slug, number, phrase, image, position) values
  ('norris', 'Lando Norris', 'mclaren', null, 'Papaya até a última volta.', '/images/pilotos/norris.jpeg', 0),
  ('verstappen', 'Max Verstappen', 'red-bull-racing', null, 'Implacável, volta após volta.', '/images/pilotos/verstappen.png', 1),
  ('hamilton', 'Lewis Hamilton', 'ferrari', null, 'Uma lenda vestida de vermelho.', '/images/pilotos/hamilton.png', 2),
  ('bortoleto', 'Gabriel Bortoleto', 'audi', null, 'O Brasil de volta ao grid.', '/images/pilotos/bortoleto.png', 3)
on conflict (slug) do update set name = excluded.name, team_slug = excluded.team_slug, number = excluded.number, phrase = excluded.phrase, image = excluded.image, position = excluded.position;

insert into public.products (code, slug, name, description, details, details_pending, price_cents, compare_at_price_cents, category_slug, team_slug, driver_slug, tags, is_new, featured, status, illustrative, position, created_at, fulfillment, dispatch_min_days, dispatch_max_days, origin, weight_grams, length_cm, width_cm, height_cm) values
  ('APX-001', 'scuderia-racing-jacket', 'Scuderia Racing Jacket', 'Corte reto, gola alta e linhas que lembram um macacão de corrida. Uma jaqueta pensada para quem torce de vermelho e quer levar essa paixão para a rua.

Forro leve, zíper frontal e bolsos laterais para o dia a dia. Combina com camiseta lisa no fim de semana de corrida e com tudo no resto da semana.', '[{"label":"Material","value":"Poliamida leve com acabamento repelente à água"},{"label":"Caimento","value":"Regular, com espaço para uma camada por baixo"},{"label":"Detalhes","value":"Zíper frontal, gola alta e bolsos laterais"},{"label":"Cuidados","value":"Lavar à mão ou em ciclo delicado; não passar"}]'::jsonb, true, 64990, null, 'teamwear', 'ferrari', null, array['jaqueta', 'ferrari']::text[], true, true, 'active', true, 0, '2026-09-20T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 1000, 35, 30, 8),
  ('APX-002', 'ferrari-team-cap', 'Ferrari Team Cap', 'Seis gomos, aba curva e o vermelho de Maranello como inspiração. O boné que vai do autódromo ao café da manhã de domingo sem pedir licença.

Ajuste traseiro para encontrar o encaixe certo e estrutura firme na frente, que mantém a forma depois de muitos fins de semana.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 18990, null, 'acessorios', 'ferrari', null, array['bone', 'acessorio', 'ferrari']::text[], false, false, 'active', true, 1, '2026-01-05T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-003', 'monaco-racing-tee', 'Monaco Racing Tee', 'Uma camiseta com estampa inspirada nas ruas de Mônaco, o circuito mais estreito e mais charmoso do calendário.

Algodão penteado, modelagem regular e toque macio desde a primeira lavagem. Para usar sozinha ou por baixo de uma jaqueta.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 22990, null, 'racing', null, null, array['camiseta', 'monaco']::text[], false, false, 'active', true, 2, '2026-01-07T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-004', 'classic-racing-hoodie', 'Classic Racing Hoodie', 'O moletom de todo fã: capuz, felpa macia e bordado discreto no peito. Clássico de propósito, para durar muitas temporadas.

Punhos e barra canelados seguram o calor nas manhãs de corrida. Fica bem com jeans, com bermuda e com o sofá de casa.', '[{"label":"Material","value":"Moletom de algodão com poliéster, felpado por dentro"},{"label":"Caimento","value":"Regular, com punhos e barra canelados"},{"label":"Detalhes","value":"Capuz com cordão e bordado no peito"},{"label":"Cuidados","value":"Lavar do avesso em água fria; secar à sombra"}]'::jsonb, true, 39990, 45990, 'teamwear', null, null, array['moletom']::text[], false, true, 'active', true, 3, '2026-01-09T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 1000, 35, 30, 8),
  ('APX-005', 'pit-lane-overshirt', 'Pit Lane Overshirt', 'Uma sobrecamisa de sarja com bolsos utilitários, inspirada no uniforme de quem trabalha nos boxes. Feita para o dia inteiro.

Usa aberta, por cima de uma camiseta, ou fechada, como camisa. Resiste ao uso e fica melhor com o tempo.', '[{"label":"Material","value":"Sarja de algodão encorpada"},{"label":"Caimento","value":"Reto, um pouco mais amplo que uma camisa"},{"label":"Detalhes","value":"Dois bolsos utilitários com aba, botões de pressão"},{"label":"Cuidados","value":"Lavar em água fria; secar à sombra"}]'::jsonb, true, 45990, null, 'racing', null, null, array['sobrecamisa']::text[], true, false, 'active', true, 4, '2026-09-10T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 1000, 35, 30, 8),
  ('APX-006', 'apex-circuit-tote', 'Apex Circuit Tote', 'A bolsa da casa: lona resistente, alças reforçadas e o traçado de um circuito estampado. Apex para levar tudo.

Cabe o notebook, a garrafa d''água e o casaco para quando o sol se esconder na arquibancada.', '[{"label":"Material","value":"Lona de algodão resistente"},{"label":"Medidas","value":"Aprox. 40 × 38 cm, alças de 60 cm"},{"label":"Cuidados","value":"Lavar à mão; não usar alvejante"}]'::jsonb, true, 16990, null, 'acessorios', null, null, array['bolsa', 'acessorio']::text[], false, false, 'active', true, 5, '2026-01-13T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-051', 'camiseta-norris', 'Camiseta Lando Norris', 'Camiseta de torcedor com o nome de Lando Norris nas costas. Papaya até a última volta.

Algodão penteado e modelagem regular, para vestir a torcida do jeito mais simples.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 23990, null, 'racing', 'mclaren', 'norris', array['camiseta', 'norris']::text[], false, false, 'active', true, 6, '2026-04-13T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-052', 'bone-norris', 'Boné Norris', 'Boné da linha de Lando Norris, com o nome bordado na lateral. Papaya até a última volta.

Aba curva, ajuste traseiro e estrutura que mantém a forma. Para usar na arquibancada e fora dela.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 19990, null, 'acessorios', 'mclaren', 'norris', array['bone', 'acessorio', 'norris']::text[], false, false, 'active', true, 7, '2026-04-15T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-053', 'miniatura-capacete-norris', 'Miniatura de capacete Norris 1:5', 'Miniatura de capacete em escala 1:5 inspirada em Lando Norris, com base expositora. Papaya até a última volta.

Uma peça de coleção para a estante, a mesa de trabalho ou o canto da casa dedicado à corrida.', '[{"label":"Escala","value":"1:5, com base expositora"},{"label":"Material","value":"Resina pintada à mão"},{"label":"Cuidados","value":"Limpar com pincel macio ou pano seco; evitar sol direto"}]'::jsonb, true, 89990, null, 'colecionaveis', 'mclaren', 'norris', array['miniatura', 'colecionavel', 'norris']::text[], true, false, 'active', true, 8, '2026-04-17T00:00:00.000Z', 'sob_encomenda', 15, 30, 'importado', 900, 20, 20, 20),
  ('APX-054', 'poster-norris', 'Pôster Lando Norris', 'Pôster 50 × 70 cm de Lando Norris, impresso em papel fotográfico fosco. Papaya até a última volta.

Chega enrolado num tubo rígido, pronto para emoldurar.', '[{"label":"Tamanho","value":"50 × 70 cm"},{"label":"Papel","value":"Fotográfico fosco"},{"label":"Envio","value":"Em tubo rígido; moldura não inclusa"}]'::jsonb, true, 9990, null, 'colecionaveis', 'mclaren', 'norris', array['poster', 'colecionavel', 'norris']::text[], false, false, 'active', true, 9, '2026-04-19T00:00:00.000Z', 'sob_encomenda', 3, 6, 'nacional', 300, 62, 8, 8),
  ('APX-055', 'camiseta-verstappen', 'Camiseta Max Verstappen', 'Camiseta de torcedor com o nome de Max Verstappen nas costas. Implacável, volta após volta.

Algodão penteado e modelagem regular, para vestir a torcida do jeito mais simples.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 23990, null, 'racing', 'red-bull-racing', 'verstappen', array['camiseta', 'verstappen']::text[], false, false, 'active', true, 10, '2026-04-21T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-056', 'bone-verstappen', 'Boné Verstappen', 'Boné da linha de Max Verstappen, com o nome bordado na lateral. Implacável, volta após volta.

Aba curva, ajuste traseiro e estrutura que mantém a forma. Para usar na arquibancada e fora dela.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 19990, null, 'acessorios', 'red-bull-racing', 'verstappen', array['bone', 'acessorio', 'verstappen']::text[], false, false, 'active', true, 11, '2026-04-23T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-057', 'miniatura-capacete-verstappen', 'Miniatura de capacete Verstappen 1:5', 'Miniatura de capacete em escala 1:5 inspirada em Max Verstappen, com base expositora. Implacável, volta após volta.

Uma peça de coleção para a estante, a mesa de trabalho ou o canto da casa dedicado à corrida.', '[{"label":"Escala","value":"1:5, com base expositora"},{"label":"Material","value":"Resina pintada à mão"},{"label":"Cuidados","value":"Limpar com pincel macio ou pano seco; evitar sol direto"}]'::jsonb, true, 89990, null, 'colecionaveis', 'red-bull-racing', 'verstappen', array['miniatura', 'colecionavel', 'verstappen']::text[], false, false, 'active', true, 12, '2026-04-25T00:00:00.000Z', 'sob_encomenda', 15, 30, 'importado', 900, 20, 20, 20),
  ('APX-058', 'poster-verstappen', 'Pôster Max Verstappen', 'Pôster 50 × 70 cm de Max Verstappen, impresso em papel fotográfico fosco. Implacável, volta após volta.

Chega enrolado num tubo rígido, pronto para emoldurar.', '[{"label":"Tamanho","value":"50 × 70 cm"},{"label":"Papel","value":"Fotográfico fosco"},{"label":"Envio","value":"Em tubo rígido; moldura não inclusa"}]'::jsonb, true, 9990, null, 'colecionaveis', 'red-bull-racing', 'verstappen', array['poster', 'colecionavel', 'verstappen']::text[], false, false, 'active', true, 13, '2026-04-27T00:00:00.000Z', 'sob_encomenda', 3, 6, 'nacional', 300, 62, 8, 8),
  ('APX-059', 'camiseta-hamilton', 'Camiseta Lewis Hamilton', 'Camiseta de torcedor com o nome de Lewis Hamilton nas costas. Uma lenda vestida de vermelho.

Algodão penteado e modelagem regular, para vestir a torcida do jeito mais simples.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 23990, null, 'racing', 'ferrari', 'hamilton', array['camiseta', 'hamilton']::text[], false, false, 'active', true, 14, '2026-04-29T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-060', 'bone-hamilton', 'Boné Hamilton', 'Boné da linha de Lewis Hamilton, com o nome bordado na lateral. Uma lenda vestida de vermelho.

Aba curva, ajuste traseiro e estrutura que mantém a forma. Para usar na arquibancada e fora dela.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 19990, null, 'acessorios', 'ferrari', 'hamilton', array['bone', 'acessorio', 'hamilton']::text[], false, false, 'active', true, 15, '2026-05-01T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-061', 'miniatura-capacete-hamilton', 'Miniatura de capacete Hamilton 1:5', 'Miniatura de capacete em escala 1:5 inspirada em Lewis Hamilton, com base expositora. Uma lenda vestida de vermelho.

Uma peça de coleção para a estante, a mesa de trabalho ou o canto da casa dedicado à corrida.', '[{"label":"Escala","value":"1:5, com base expositora"},{"label":"Material","value":"Resina pintada à mão"},{"label":"Cuidados","value":"Limpar com pincel macio ou pano seco; evitar sol direto"}]'::jsonb, true, 89990, null, 'colecionaveis', 'ferrari', 'hamilton', array['miniatura', 'colecionavel', 'hamilton']::text[], true, true, 'active', true, 16, '2026-05-03T00:00:00.000Z', 'sob_encomenda', 15, 30, 'importado', 900, 20, 20, 20),
  ('APX-062', 'poster-hamilton', 'Pôster Lewis Hamilton', 'Pôster 50 × 70 cm de Lewis Hamilton, impresso em papel fotográfico fosco. Uma lenda vestida de vermelho.

Chega enrolado num tubo rígido, pronto para emoldurar.', '[{"label":"Tamanho","value":"50 × 70 cm"},{"label":"Papel","value":"Fotográfico fosco"},{"label":"Envio","value":"Em tubo rígido; moldura não inclusa"}]'::jsonb, true, 9990, null, 'colecionaveis', 'ferrari', 'hamilton', array['poster', 'colecionavel', 'hamilton']::text[], false, false, 'active', true, 17, '2026-05-05T00:00:00.000Z', 'sob_encomenda', 3, 6, 'nacional', 300, 62, 8, 8),
  ('APX-063', 'camiseta-bortoleto', 'Camiseta Gabriel Bortoleto', 'Camiseta de torcedor com o nome de Gabriel Bortoleto nas costas. O Brasil de volta ao grid.

Algodão penteado e modelagem regular, para vestir a torcida do jeito mais simples.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 23990, null, 'racing', 'audi', 'bortoleto', array['camiseta', 'bortoleto']::text[], true, false, 'active', true, 18, '2026-05-07T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-064', 'bone-bortoleto', 'Boné Bortoleto', 'Boné da linha de Gabriel Bortoleto, com o nome bordado na lateral. O Brasil de volta ao grid.

Aba curva, ajuste traseiro e estrutura que mantém a forma. Para usar na arquibancada e fora dela.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 19990, null, 'acessorios', 'audi', 'bortoleto', array['bone', 'acessorio', 'bortoleto']::text[], false, false, 'active', true, 19, '2026-05-09T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-065', 'miniatura-capacete-bortoleto', 'Miniatura de capacete Bortoleto 1:5', 'Miniatura de capacete em escala 1:5 inspirada em Gabriel Bortoleto, com base expositora. O Brasil de volta ao grid.

Uma peça de coleção para a estante, a mesa de trabalho ou o canto da casa dedicado à corrida.', '[{"label":"Escala","value":"1:5, com base expositora"},{"label":"Material","value":"Resina pintada à mão"},{"label":"Cuidados","value":"Limpar com pincel macio ou pano seco; evitar sol direto"}]'::jsonb, true, 89990, null, 'colecionaveis', 'audi', 'bortoleto', array['miniatura', 'colecionavel', 'bortoleto']::text[], false, true, 'active', true, 20, '2026-05-11T00:00:00.000Z', 'sob_encomenda', 15, 30, 'importado', 900, 20, 20, 20),
  ('APX-066', 'poster-bortoleto', 'Pôster Gabriel Bortoleto', 'Pôster 50 × 70 cm de Gabriel Bortoleto, impresso em papel fotográfico fosco. O Brasil de volta ao grid.

Chega enrolado num tubo rígido, pronto para emoldurar.', '[{"label":"Tamanho","value":"50 × 70 cm"},{"label":"Papel","value":"Fotográfico fosco"},{"label":"Envio","value":"Em tubo rígido; moldura não inclusa"}]'::jsonb, true, 9990, null, 'colecionaveis', 'audi', 'bortoleto', array['poster', 'colecionavel', 'bortoleto']::text[], false, false, 'active', true, 21, '2026-05-13T00:00:00.000Z', 'sob_encomenda', 3, 6, 'nacional', 300, 62, 8, 8),
  ('APX-007', 'camiseta-ferrari-2026', 'Camiseta Ferrari 2026', 'Uma camiseta de torcedor com as cores da Ferrari para a temporada 2026. O vermelho mais famoso do grid.

Algodão macio, modelagem regular e estampa resistente a muitas lavagens. Feita para o domingo de corrida e para os outros seis dias.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 21990, null, 'teamwear', 'ferrari', null, array['camiseta', 'ferrari']::text[], true, false, 'active', true, 22, '2026-01-15T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-008', 'bone-ferrari', 'Boné Ferrari', 'Boné nas cores da Ferrari, com aba curva e ajuste traseiro. O vermelho mais famoso do grid.

Leve e firme na medida certa. Protege do sol na arquibancada e completa o visual de quem acompanha cada largada.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 17990, 21990, 'acessorios', 'ferrari', null, array['bone', 'acessorio', 'ferrari']::text[], false, false, 'active', true, 23, '2026-01-17T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-009', 'moletom-ferrari', 'Moletom Ferrari', 'Moletom com capuz nas cores da Ferrari, felpado por dentro e com bolso canguru. O vermelho mais famoso do grid.

Para as manhãs frias de corrida e para as madrugadas de GP do outro lado do mundo.', '[{"label":"Material","value":"Moletom de algodão com poliéster, felpado por dentro"},{"label":"Caimento","value":"Regular, com punhos e barra canelados"},{"label":"Cuidados","value":"Lavar do avesso em água fria; secar à sombra"}]'::jsonb, true, 38990, null, 'teamwear', 'ferrari', null, array['moletom', 'ferrari']::text[], false, false, 'active', true, 24, '2026-01-19T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-010', 'jaqueta-ferrari', 'Jaqueta Ferrari', 'Jaqueta corta-vento nas cores da Ferrari, leve e com capuz embutido na gola. O vermelho mais famoso do grid.

Dobra fácil na mochila e segura o vento e a garoa. A peça que todo fã quer ter à mão em dia de autódromo.', '[{"label":"Material","value":"Poliamida leve com acabamento repelente à água"},{"label":"Caimento","value":"Regular, com espaço para uma camada por baixo"},{"label":"Detalhes","value":"Capuz embutido na gola, zíper frontal"},{"label":"Cuidados","value":"Lavar à mão ou em ciclo delicado; não passar"}]'::jsonb, true, 59990, null, 'racing', 'ferrari', null, array['jaqueta', 'ferrari']::text[], false, false, 'active', true, 25, '2026-01-21T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-011', 'camiseta-mercedes-2026', 'Camiseta Mercedes 2026', 'Uma camiseta de torcedor com as cores da Mercedes para a temporada 2026. Prata, preto e precisão alemã.

Algodão macio, modelagem regular e estampa resistente a muitas lavagens. Feita para o domingo de corrida e para os outros seis dias.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 22990, null, 'teamwear', 'mercedes', null, array['camiseta', 'mercedes']::text[], false, false, 'active', true, 26, '2026-01-23T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-012', 'bone-mercedes', 'Boné Mercedes', 'Boné nas cores da Mercedes, com aba curva e ajuste traseiro. Prata, preto e precisão alemã.

Leve e firme na medida certa. Protege do sol na arquibancada e completa o visual de quem acompanha cada largada.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 18990, null, 'acessorios', 'mercedes', null, array['bone', 'acessorio', 'mercedes']::text[], false, false, 'active', true, 27, '2026-01-25T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-013', 'moletom-mercedes', 'Moletom Mercedes', 'Moletom com capuz nas cores da Mercedes, felpado por dentro e com bolso canguru. Prata, preto e precisão alemã.

Para as manhãs frias de corrida e para as madrugadas de GP do outro lado do mundo.', '[{"label":"Material","value":"Moletom de algodão com poliéster, felpado por dentro"},{"label":"Caimento","value":"Regular, com punhos e barra canelados"},{"label":"Cuidados","value":"Lavar do avesso em água fria; secar à sombra"}]'::jsonb, true, 40990, null, 'teamwear', 'mercedes', null, array['moletom', 'mercedes']::text[], false, false, 'active', true, 28, '2026-01-27T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-014', 'jaqueta-mercedes', 'Jaqueta Mercedes', 'Jaqueta corta-vento nas cores da Mercedes, leve e com capuz embutido na gola. Prata, preto e precisão alemã.

Dobra fácil na mochila e segura o vento e a garoa. A peça que todo fã quer ter à mão em dia de autódromo.', '[{"label":"Material","value":"Poliamida leve com acabamento repelente à água"},{"label":"Caimento","value":"Regular, com espaço para uma camada por baixo"},{"label":"Detalhes","value":"Capuz embutido na gola, zíper frontal"},{"label":"Cuidados","value":"Lavar à mão ou em ciclo delicado; não passar"}]'::jsonb, true, 61990, null, 'racing', 'mercedes', null, array['jaqueta', 'mercedes']::text[], true, false, 'active', true, 29, '2026-01-29T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-015', 'camiseta-mclaren-2026', 'Camiseta McLaren 2026', 'Uma camiseta de torcedor com as cores da McLaren para a temporada 2026. Papaya de Woking para o mundo.

Algodão macio, modelagem regular e estampa resistente a muitas lavagens. Feita para o domingo de corrida e para os outros seis dias.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 23990, null, 'teamwear', 'mclaren', null, array['camiseta', 'mclaren']::text[], false, false, 'active', true, 30, '2026-01-31T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-016', 'bone-mclaren', 'Boné McLaren', 'Boné nas cores da McLaren, com aba curva e ajuste traseiro. Papaya de Woking para o mundo.

Leve e firme na medida certa. Protege do sol na arquibancada e completa o visual de quem acompanha cada largada.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 17990, null, 'acessorios', 'mclaren', null, array['bone', 'acessorio', 'mclaren']::text[], false, false, 'active', true, 31, '2026-02-02T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-017', 'moletom-mclaren', 'Moletom McLaren', 'Moletom com capuz nas cores da McLaren, felpado por dentro e com bolso canguru. Papaya de Woking para o mundo.

Para as manhãs frias de corrida e para as madrugadas de GP do outro lado do mundo.', '[{"label":"Material","value":"Moletom de algodão com poliéster, felpado por dentro"},{"label":"Caimento","value":"Regular, com punhos e barra canelados"},{"label":"Cuidados","value":"Lavar do avesso em água fria; secar à sombra"}]'::jsonb, true, 42990, null, 'teamwear', 'mclaren', null, array['moletom', 'mclaren']::text[], false, false, 'active', true, 32, '2026-02-04T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-018', 'jaqueta-mclaren', 'Jaqueta McLaren', 'Jaqueta corta-vento nas cores da McLaren, leve e com capuz embutido na gola. Papaya de Woking para o mundo.

Dobra fácil na mochila e segura o vento e a garoa. A peça que todo fã quer ter à mão em dia de autódromo.', '[{"label":"Material","value":"Poliamida leve com acabamento repelente à água"},{"label":"Caimento","value":"Regular, com espaço para uma camada por baixo"},{"label":"Detalhes","value":"Capuz embutido na gola, zíper frontal"},{"label":"Cuidados","value":"Lavar à mão ou em ciclo delicado; não passar"}]'::jsonb, true, 63990, 73990, 'racing', 'mclaren', null, array['jaqueta', 'mclaren']::text[], false, false, 'active', true, 33, '2026-02-06T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-019', 'camiseta-red-bull-racing-2026', 'Camiseta Red Bull Racing 2026', 'Uma camiseta de torcedor com as cores da Red Bull Racing para a temporada 2026. Asas para quem acelera.

Algodão macio, modelagem regular e estampa resistente a muitas lavagens. Feita para o domingo de corrida e para os outros seis dias.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 21990, null, 'teamwear', 'red-bull-racing', null, array['camiseta', 'red-bull-racing']::text[], false, false, 'active', true, 34, '2026-02-08T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-020', 'bone-red-bull-racing', 'Boné Red Bull Racing', 'Boné nas cores da Red Bull Racing, com aba curva e ajuste traseiro. Asas para quem acelera.

Leve e firme na medida certa. Protege do sol na arquibancada e completa o visual de quem acompanha cada largada.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 18990, 21990, 'acessorios', 'red-bull-racing', null, array['bone', 'acessorio', 'red-bull-racing']::text[], false, false, 'active', true, 35, '2026-02-10T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-021', 'moletom-red-bull-racing', 'Moletom Red Bull Racing', 'Moletom com capuz nas cores da Red Bull Racing, felpado por dentro e com bolso canguru. Asas para quem acelera.

Para as manhãs frias de corrida e para as madrugadas de GP do outro lado do mundo.', '[{"label":"Material","value":"Moletom de algodão com poliéster, felpado por dentro"},{"label":"Caimento","value":"Regular, com punhos e barra canelados"},{"label":"Cuidados","value":"Lavar do avesso em água fria; secar à sombra"}]'::jsonb, true, 38990, null, 'teamwear', 'red-bull-racing', null, array['moletom', 'red-bull-racing']::text[], false, false, 'active', true, 36, '2026-02-12T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-022', 'jaqueta-red-bull-racing', 'Jaqueta Red Bull Racing', 'Jaqueta corta-vento nas cores da Red Bull Racing, leve e com capuz embutido na gola. Asas para quem acelera.

Dobra fácil na mochila e segura o vento e a garoa. A peça que todo fã quer ter à mão em dia de autódromo.', '[{"label":"Material","value":"Poliamida leve com acabamento repelente à água"},{"label":"Caimento","value":"Regular, com espaço para uma camada por baixo"},{"label":"Detalhes","value":"Capuz embutido na gola, zíper frontal"},{"label":"Cuidados","value":"Lavar à mão ou em ciclo delicado; não passar"}]'::jsonb, true, 65990, null, 'racing', 'red-bull-racing', null, array['jaqueta', 'red-bull-racing']::text[], false, false, 'active', true, 37, '2026-02-14T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-023', 'camiseta-aston-martin-2026', 'Camiseta Aston Martin 2026', 'Uma camiseta de torcedor com as cores da Aston Martin para a temporada 2026. O verde britânico de corrida.

Algodão macio, modelagem regular e estampa resistente a muitas lavagens. Feita para o domingo de corrida e para os outros seis dias.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 22990, null, 'teamwear', 'aston-martin', null, array['camiseta', 'aston-martin']::text[], true, false, 'active', true, 38, '2026-02-16T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-024', 'bone-aston-martin', 'Boné Aston Martin', 'Boné nas cores da Aston Martin, com aba curva e ajuste traseiro. O verde britânico de corrida.

Leve e firme na medida certa. Protege do sol na arquibancada e completa o visual de quem acompanha cada largada.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 17990, null, 'acessorios', 'aston-martin', null, array['bone', 'acessorio', 'aston-martin']::text[], false, false, 'active', true, 39, '2026-02-18T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-025', 'moletom-aston-martin', 'Moletom Aston Martin', 'Moletom com capuz nas cores da Aston Martin, felpado por dentro e com bolso canguru. O verde britânico de corrida.

Para as manhãs frias de corrida e para as madrugadas de GP do outro lado do mundo.', '[{"label":"Material","value":"Moletom de algodão com poliéster, felpado por dentro"},{"label":"Caimento","value":"Regular, com punhos e barra canelados"},{"label":"Cuidados","value":"Lavar do avesso em água fria; secar à sombra"}]'::jsonb, true, 40990, null, 'teamwear', 'aston-martin', null, array['moletom', 'aston-martin']::text[], false, false, 'active', true, 40, '2026-02-20T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-026', 'jaqueta-aston-martin', 'Jaqueta Aston Martin', 'Jaqueta corta-vento nas cores da Aston Martin, leve e com capuz embutido na gola. O verde britânico de corrida.

Dobra fácil na mochila e segura o vento e a garoa. A peça que todo fã quer ter à mão em dia de autódromo.', '[{"label":"Material","value":"Poliamida leve com acabamento repelente à água"},{"label":"Caimento","value":"Regular, com espaço para uma camada por baixo"},{"label":"Detalhes","value":"Capuz embutido na gola, zíper frontal"},{"label":"Cuidados","value":"Lavar à mão ou em ciclo delicado; não passar"}]'::jsonb, true, 59990, null, 'racing', 'aston-martin', null, array['jaqueta', 'aston-martin']::text[], false, false, 'active', true, 41, '2026-02-22T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-027', 'camiseta-williams-2026', 'Camiseta Williams 2026', 'Uma camiseta de torcedor com as cores da Williams para a temporada 2026. Uma das grandes famílias da F1.

Algodão macio, modelagem regular e estampa resistente a muitas lavagens. Feita para o domingo de corrida e para os outros seis dias.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 23990, null, 'teamwear', 'williams', null, array['camiseta', 'williams']::text[], false, false, 'active', true, 42, '2026-02-24T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-028', 'bone-williams', 'Boné Williams', 'Boné nas cores da Williams, com aba curva e ajuste traseiro. Uma das grandes famílias da F1.

Leve e firme na medida certa. Protege do sol na arquibancada e completa o visual de quem acompanha cada largada.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 18990, null, 'acessorios', 'williams', null, array['bone', 'acessorio', 'williams']::text[], false, false, 'active', true, 43, '2026-02-26T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-029', 'moletom-williams', 'Moletom Williams', 'Moletom com capuz nas cores da Williams, felpado por dentro e com bolso canguru. Uma das grandes famílias da F1.

Para as manhãs frias de corrida e para as madrugadas de GP do outro lado do mundo.', '[{"label":"Material","value":"Moletom de algodão com poliéster, felpado por dentro"},{"label":"Caimento","value":"Regular, com punhos e barra canelados"},{"label":"Cuidados","value":"Lavar do avesso em água fria; secar à sombra"}]'::jsonb, true, 42990, null, 'teamwear', 'williams', null, array['moletom', 'williams']::text[], false, false, 'active', true, 44, '2026-02-28T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-030', 'jaqueta-williams', 'Jaqueta Williams', 'Jaqueta corta-vento nas cores da Williams, leve e com capuz embutido na gola. Uma das grandes famílias da F1.

Dobra fácil na mochila e segura o vento e a garoa. A peça que todo fã quer ter à mão em dia de autódromo.', '[{"label":"Material","value":"Poliamida leve com acabamento repelente à água"},{"label":"Caimento","value":"Regular, com espaço para uma camada por baixo"},{"label":"Detalhes","value":"Capuz embutido na gola, zíper frontal"},{"label":"Cuidados","value":"Lavar à mão ou em ciclo delicado; não passar"}]'::jsonb, true, 61990, null, 'racing', 'williams', null, array['jaqueta', 'williams']::text[], true, false, 'active', true, 45, '2026-03-02T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-031', 'camiseta-alpine-2026', 'Camiseta Alpine 2026', 'Uma camiseta de torcedor com as cores da Alpine para a temporada 2026. Azul francês em ritmo de corrida.

Algodão macio, modelagem regular e estampa resistente a muitas lavagens. Feita para o domingo de corrida e para os outros seis dias.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 21990, null, 'teamwear', 'alpine', null, array['camiseta', 'alpine']::text[], false, false, 'active', true, 46, '2026-03-04T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-032', 'bone-alpine', 'Boné Alpine', 'Boné nas cores da Alpine, com aba curva e ajuste traseiro. Azul francês em ritmo de corrida.

Leve e firme na medida certa. Protege do sol na arquibancada e completa o visual de quem acompanha cada largada.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 17990, 21990, 'acessorios', 'alpine', null, array['bone', 'acessorio', 'alpine']::text[], false, false, 'active', true, 47, '2026-03-06T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-033', 'moletom-alpine', 'Moletom Alpine', 'Moletom com capuz nas cores da Alpine, felpado por dentro e com bolso canguru. Azul francês em ritmo de corrida.

Para as manhãs frias de corrida e para as madrugadas de GP do outro lado do mundo.', '[{"label":"Material","value":"Moletom de algodão com poliéster, felpado por dentro"},{"label":"Caimento","value":"Regular, com punhos e barra canelados"},{"label":"Cuidados","value":"Lavar do avesso em água fria; secar à sombra"}]'::jsonb, true, 38990, null, 'teamwear', 'alpine', null, array['moletom', 'alpine']::text[], false, false, 'active', true, 48, '2026-03-08T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-034', 'jaqueta-alpine', 'Jaqueta Alpine', 'Jaqueta corta-vento nas cores da Alpine, leve e com capuz embutido na gola. Azul francês em ritmo de corrida.

Dobra fácil na mochila e segura o vento e a garoa. A peça que todo fã quer ter à mão em dia de autódromo.', '[{"label":"Material","value":"Poliamida leve com acabamento repelente à água"},{"label":"Caimento","value":"Regular, com espaço para uma camada por baixo"},{"label":"Detalhes","value":"Capuz embutido na gola, zíper frontal"},{"label":"Cuidados","value":"Lavar à mão ou em ciclo delicado; não passar"}]'::jsonb, true, 63990, null, 'racing', 'alpine', null, array['jaqueta', 'alpine']::text[], false, false, 'active', true, 49, '2026-03-10T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-035', 'camiseta-haas-2026', 'Camiseta Haas 2026', 'Uma camiseta de torcedor com as cores da Haas para a temporada 2026. A equipe americana do grid.

Algodão macio, modelagem regular e estampa resistente a muitas lavagens. Feita para o domingo de corrida e para os outros seis dias.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 22990, null, 'teamwear', 'haas', null, array['camiseta', 'haas']::text[], false, false, 'active', true, 50, '2026-03-12T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-036', 'bone-haas', 'Boné Haas', 'Boné nas cores da Haas, com aba curva e ajuste traseiro. A equipe americana do grid.

Leve e firme na medida certa. Protege do sol na arquibancada e completa o visual de quem acompanha cada largada.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 18990, null, 'acessorios', 'haas', null, array['bone', 'acessorio', 'haas']::text[], false, false, 'active', true, 51, '2026-03-14T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-037', 'moletom-haas', 'Moletom Haas', 'Moletom com capuz nas cores da Haas, felpado por dentro e com bolso canguru. A equipe americana do grid.

Para as manhãs frias de corrida e para as madrugadas de GP do outro lado do mundo.', '[{"label":"Material","value":"Moletom de algodão com poliéster, felpado por dentro"},{"label":"Caimento","value":"Regular, com punhos e barra canelados"},{"label":"Cuidados","value":"Lavar do avesso em água fria; secar à sombra"}]'::jsonb, true, 40990, null, 'teamwear', 'haas', null, array['moletom', 'haas']::text[], false, false, 'active', true, 52, '2026-03-16T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-038', 'jaqueta-haas', 'Jaqueta Haas', 'Jaqueta corta-vento nas cores da Haas, leve e com capuz embutido na gola. A equipe americana do grid.

Dobra fácil na mochila e segura o vento e a garoa. A peça que todo fã quer ter à mão em dia de autódromo.', '[{"label":"Material","value":"Poliamida leve com acabamento repelente à água"},{"label":"Caimento","value":"Regular, com espaço para uma camada por baixo"},{"label":"Detalhes","value":"Capuz embutido na gola, zíper frontal"},{"label":"Cuidados","value":"Lavar à mão ou em ciclo delicado; não passar"}]'::jsonb, true, 65990, 75990, 'racing', 'haas', null, array['jaqueta', 'haas']::text[], false, false, 'active', true, 53, '2026-03-18T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-039', 'camiseta-racing-bulls-2026', 'Camiseta Racing Bulls 2026', 'Uma camiseta de torcedor com as cores da Racing Bulls para a temporada 2026. A escola de talentos de Faenza.

Algodão macio, modelagem regular e estampa resistente a muitas lavagens. Feita para o domingo de corrida e para os outros seis dias.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 23990, null, 'teamwear', 'racing-bulls', null, array['camiseta', 'racing-bulls']::text[], true, false, 'active', true, 54, '2026-03-20T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-040', 'bone-racing-bulls', 'Boné Racing Bulls', 'Boné nas cores da Racing Bulls, com aba curva e ajuste traseiro. A escola de talentos de Faenza.

Leve e firme na medida certa. Protege do sol na arquibancada e completa o visual de quem acompanha cada largada.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 17990, null, 'acessorios', 'racing-bulls', null, array['bone', 'acessorio', 'racing-bulls']::text[], false, false, 'active', true, 55, '2026-03-22T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-041', 'moletom-racing-bulls', 'Moletom Racing Bulls', 'Moletom com capuz nas cores da Racing Bulls, felpado por dentro e com bolso canguru. A escola de talentos de Faenza.

Para as manhãs frias de corrida e para as madrugadas de GP do outro lado do mundo.', '[{"label":"Material","value":"Moletom de algodão com poliéster, felpado por dentro"},{"label":"Caimento","value":"Regular, com punhos e barra canelados"},{"label":"Cuidados","value":"Lavar do avesso em água fria; secar à sombra"}]'::jsonb, true, 42990, null, 'teamwear', 'racing-bulls', null, array['moletom', 'racing-bulls']::text[], false, false, 'active', true, 56, '2026-03-24T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-042', 'jaqueta-racing-bulls', 'Jaqueta Racing Bulls', 'Jaqueta corta-vento nas cores da Racing Bulls, leve e com capuz embutido na gola. A escola de talentos de Faenza.

Dobra fácil na mochila e segura o vento e a garoa. A peça que todo fã quer ter à mão em dia de autódromo.', '[{"label":"Material","value":"Poliamida leve com acabamento repelente à água"},{"label":"Caimento","value":"Regular, com espaço para uma camada por baixo"},{"label":"Detalhes","value":"Capuz embutido na gola, zíper frontal"},{"label":"Cuidados","value":"Lavar à mão ou em ciclo delicado; não passar"}]'::jsonb, true, 59990, null, 'racing', 'racing-bulls', null, array['jaqueta', 'racing-bulls']::text[], false, false, 'active', true, 57, '2026-03-26T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-043', 'camiseta-audi-2026', 'Camiseta Audi 2026', 'Uma camiseta de torcedor com as cores da Audi para a temporada 2026. Quatro argolas no grid.

Algodão macio, modelagem regular e estampa resistente a muitas lavagens. Feita para o domingo de corrida e para os outros seis dias.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 21990, null, 'teamwear', 'audi', null, array['camiseta', 'audi']::text[], false, false, 'active', true, 58, '2026-03-28T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-044', 'bone-audi', 'Boné Audi', 'Boné nas cores da Audi, com aba curva e ajuste traseiro. Quatro argolas no grid.

Leve e firme na medida certa. Protege do sol na arquibancada e completa o visual de quem acompanha cada largada.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 18990, 21990, 'acessorios', 'audi', null, array['bone', 'acessorio', 'audi']::text[], false, false, 'active', true, 59, '2026-03-30T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-045', 'moletom-audi', 'Moletom Audi', 'Moletom com capuz nas cores da Audi, felpado por dentro e com bolso canguru. Quatro argolas no grid.

Para as manhãs frias de corrida e para as madrugadas de GP do outro lado do mundo.', '[{"label":"Material","value":"Moletom de algodão com poliéster, felpado por dentro"},{"label":"Caimento","value":"Regular, com punhos e barra canelados"},{"label":"Cuidados","value":"Lavar do avesso em água fria; secar à sombra"}]'::jsonb, true, 38990, null, 'teamwear', 'audi', null, array['moletom', 'audi']::text[], false, false, 'active', true, 60, '2026-04-01T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-046', 'jaqueta-audi', 'Jaqueta Audi', 'Jaqueta corta-vento nas cores da Audi, leve e com capuz embutido na gola. Quatro argolas no grid.

Dobra fácil na mochila e segura o vento e a garoa. A peça que todo fã quer ter à mão em dia de autódromo.', '[{"label":"Material","value":"Poliamida leve com acabamento repelente à água"},{"label":"Caimento","value":"Regular, com espaço para uma camada por baixo"},{"label":"Detalhes","value":"Capuz embutido na gola, zíper frontal"},{"label":"Cuidados","value":"Lavar à mão ou em ciclo delicado; não passar"}]'::jsonb, true, 61990, null, 'racing', 'audi', null, array['jaqueta', 'audi']::text[], true, false, 'active', true, 61, '2026-04-03T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-047', 'camiseta-cadillac-2026', 'Camiseta Cadillac 2026', 'Uma camiseta de torcedor com as cores da Cadillac para a temporada 2026. A estreia americana na F1.

Algodão macio, modelagem regular e estampa resistente a muitas lavagens. Feita para o domingo de corrida e para os outros seis dias.', '[{"label":"Material","value":"100% algodão penteado, malha de toque macio"},{"label":"Caimento","value":"Regular, reto no corpo"},{"label":"Cuidados","value":"Lavar do avesso em água fria; não usar secadora; passar do avesso"}]'::jsonb, true, 22990, null, 'teamwear', 'cadillac', null, array['camiseta', 'cadillac']::text[], false, false, 'active', true, 62, '2026-04-05T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 30, 25, 3),
  ('APX-048', 'bone-cadillac', 'Boné Cadillac', 'Boné nas cores da Cadillac, com aba curva e ajuste traseiro. A estreia americana na F1.

Leve e firme na medida certa. Protege do sol na arquibancada e completa o visual de quem acompanha cada largada.', '[{"label":"Material","value":"Sarja de algodão, aba pré-curvada"},{"label":"Ajuste","value":"Fecho traseiro regulável, tamanho único"},{"label":"Cuidados","value":"Limpar à mão com pano úmido; não lavar na máquina"}]'::jsonb, true, 17990, null, 'acessorios', 'cadillac', null, array['bone', 'acessorio', 'cadillac']::text[], false, false, 'active', true, 63, '2026-04-07T00:00:00.000Z', 'estoque_proprio', 1, 2, 'nacional', 250, 25, 20, 14),
  ('APX-049', 'moletom-cadillac', 'Moletom Cadillac', 'Moletom com capuz nas cores da Cadillac, felpado por dentro e com bolso canguru. A estreia americana na F1.

Para as manhãs frias de corrida e para as madrugadas de GP do outro lado do mundo.', '[{"label":"Material","value":"Moletom de algodão com poliéster, felpado por dentro"},{"label":"Caimento","value":"Regular, com punhos e barra canelados"},{"label":"Cuidados","value":"Lavar do avesso em água fria; secar à sombra"}]'::jsonb, true, 40990, null, 'teamwear', 'cadillac', null, array['moletom', 'cadillac']::text[], false, false, 'active', true, 64, '2026-04-09T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8),
  ('APX-050', 'jaqueta-cadillac', 'Jaqueta Cadillac', 'Jaqueta corta-vento nas cores da Cadillac, leve e com capuz embutido na gola. A estreia americana na F1.

Dobra fácil na mochila e segura o vento e a garoa. A peça que todo fã quer ter à mão em dia de autódromo.', '[{"label":"Material","value":"Poliamida leve com acabamento repelente à água"},{"label":"Caimento","value":"Regular, com espaço para uma camada por baixo"},{"label":"Detalhes","value":"Capuz embutido na gola, zíper frontal"},{"label":"Cuidados","value":"Lavar à mão ou em ciclo delicado; não passar"}]'::jsonb, true, 63990, null, 'racing', 'cadillac', null, array['jaqueta', 'cadillac']::text[], false, false, 'active', true, 65, '2026-04-11T00:00:00.000Z', 'sob_encomenda', 7, 12, 'nacional', 900, 35, 30, 8)
on conflict (code) do update set slug = excluded.slug, name = excluded.name, description = excluded.description, details = excluded.details, details_pending = excluded.details_pending, price_cents = excluded.price_cents, compare_at_price_cents = excluded.compare_at_price_cents, category_slug = excluded.category_slug, team_slug = excluded.team_slug, driver_slug = excluded.driver_slug, tags = excluded.tags, is_new = excluded.is_new, featured = excluded.featured, status = excluded.status, illustrative = excluded.illustrative, position = excluded.position, created_at = excluded.created_at, fulfillment = excluded.fulfillment, dispatch_min_days = excluded.dispatch_min_days, dispatch_max_days = excluded.dispatch_max_days, origin = excluded.origin, weight_grams = excluded.weight_grams, length_cm = excluded.length_cm, width_cm = excluded.width_cm, height_cm = excluded.height_cm;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'bestseller_manual') then
    update public.products p set bestseller_manual = v.manual, bestseller_rank = v.rank, new_until = v.until
    from (values
      ('APX-001', true, 2::integer, null::date),
      ('APX-002', false, null::integer, null::date),
      ('APX-003', false, null::integer, null::date),
      ('APX-004', false, null::integer, null::date),
      ('APX-005', false, null::integer, null::date),
      ('APX-006', false, null::integer, null::date),
      ('APX-051', false, null::integer, null::date),
      ('APX-052', false, null::integer, null::date),
      ('APX-053', false, null::integer, '2026-12-31'::date),
      ('APX-054', false, null::integer, null::date),
      ('APX-055', false, null::integer, null::date),
      ('APX-056', false, null::integer, null::date),
      ('APX-057', false, null::integer, null::date),
      ('APX-058', false, null::integer, null::date),
      ('APX-059', true, 1::integer, null::date),
      ('APX-060', false, null::integer, null::date),
      ('APX-061', false, null::integer, null::date),
      ('APX-062', false, null::integer, null::date),
      ('APX-063', true, 4::integer, null::date),
      ('APX-064', false, null::integer, null::date),
      ('APX-065', false, null::integer, null::date),
      ('APX-066', false, null::integer, '2026-12-31'::date),
      ('APX-007', false, null::integer, null::date),
      ('APX-008', true, 3::integer, null::date),
      ('APX-009', false, null::integer, null::date),
      ('APX-010', false, null::integer, null::date),
      ('APX-011', false, null::integer, null::date),
      ('APX-012', false, null::integer, null::date),
      ('APX-013', false, null::integer, null::date),
      ('APX-014', false, null::integer, null::date),
      ('APX-015', false, null::integer, null::date),
      ('APX-016', false, null::integer, null::date),
      ('APX-017', false, null::integer, null::date),
      ('APX-018', false, null::integer, null::date),
      ('APX-019', false, null::integer, null::date),
      ('APX-020', false, null::integer, null::date),
      ('APX-021', false, null::integer, null::date),
      ('APX-022', false, null::integer, null::date),
      ('APX-023', false, null::integer, null::date),
      ('APX-024', false, null::integer, null::date),
      ('APX-025', false, null::integer, null::date),
      ('APX-026', false, null::integer, null::date),
      ('APX-027', false, null::integer, null::date),
      ('APX-028', false, null::integer, null::date),
      ('APX-029', false, null::integer, null::date),
      ('APX-030', false, null::integer, null::date),
      ('APX-031', false, null::integer, null::date),
      ('APX-032', false, null::integer, null::date),
      ('APX-033', false, null::integer, null::date),
      ('APX-034', false, null::integer, null::date),
      ('APX-035', false, null::integer, null::date),
      ('APX-036', false, null::integer, null::date),
      ('APX-037', false, null::integer, null::date),
      ('APX-038', false, null::integer, null::date),
      ('APX-039', false, null::integer, null::date),
      ('APX-040', false, null::integer, null::date),
      ('APX-041', false, null::integer, null::date),
      ('APX-042', false, null::integer, null::date),
      ('APX-043', false, null::integer, null::date),
      ('APX-044', false, null::integer, null::date),
      ('APX-045', false, null::integer, null::date),
      ('APX-046', false, null::integer, null::date),
      ('APX-047', false, null::integer, null::date),
      ('APX-048', false, null::integer, null::date),
      ('APX-049', false, null::integer, null::date),
      ('APX-050', false, null::integer, null::date)
    ) as v(code, manual, rank, until)
    where p.code = v.code;
  end if;
end $$;

insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-001-P', (select id from public.products where code = 'APX-001'), 'P', null, 7, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-001-M', (select id from public.products where code = 'APX-001'), 'M', null, 9, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-001-G', (select id from public.products where code = 'APX-001'), 'G', null, 0, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-001-GG', (select id from public.products where code = 'APX-001'), 'GG', null, 2, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-001') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-001'), 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', 'Scuderia Racing Jacket', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-001'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Scuderia Racing Jacket em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-002-UN', (select id from public.products where code = 'APX-002'), 'Único', null, 7, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-002') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-002'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Ferrari Team Cap', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-002'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Ferrari Team Cap, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-003-P', (select id from public.products where code = 'APX-003'), 'P', null, 10, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-003-M', (select id from public.products where code = 'APX-003'), 'M', null, 0, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-003-G', (select id from public.products where code = 'APX-003'), 'G', null, 3, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-003-GG', (select id from public.products where code = 'APX-003'), 'GG', null, 5, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-003') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-003'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Monaco Racing Tee', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-003'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Carro de Fórmula 1 em Mônaco', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-004-P', (select id from public.products where code = 'APX-004'), 'P', null, 6, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-004-M', (select id from public.products where code = 'APX-004'), 'M', null, 8, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-004-G', (select id from public.products where code = 'APX-004'), 'G', null, 10, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-004-GG', (select id from public.products where code = 'APX-004'), 'GG', null, 0, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-004') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-004'), 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85', 'Classic Racing Hoodie', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-004'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Classic Racing Hoodie em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-005-P', (select id from public.products where code = 'APX-005'), 'P', null, 2, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-005-M', (select id from public.products where code = 'APX-005'), 'M', null, 4, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-005-G', (select id from public.products where code = 'APX-005'), 'G', null, 6, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-005-GG', (select id from public.products where code = 'APX-005'), 'GG', null, 8, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-005') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-005'), 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85', 'Pit Lane Overshirt', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-005'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Pit Lane Overshirt, inspiração', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-006-UN', (select id from public.products where code = 'APX-006'), 'Único', null, 11, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-006') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-006'), 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=85', 'Apex Circuit Tote', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-006'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Apex Circuit Tote, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-051-P', (select id from public.products where code = 'APX-051'), 'P', null, 5, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-051-M', (select id from public.products where code = 'APX-051'), 'M', null, 7, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-051-G', (select id from public.products where code = 'APX-051'), 'G', null, 9, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-051-GG', (select id from public.products where code = 'APX-051'), 'GG', null, 0, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-051') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-051'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Lando Norris', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-051'), '/images/pilotos/norris.jpeg', 'Lando Norris', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-052-UN', (select id from public.products where code = 'APX-052'), 'Único', null, 12, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-052') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-052'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Norris', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-052'), '/images/pilotos/norris.jpeg', 'Lando Norris', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-053-UN', (select id from public.products where code = 'APX-053'), 'Único', null, 13, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-053') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-053'), 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=85', 'Miniatura de capacete Norris', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-053'), '/images/pilotos/norris.jpeg', 'Lando Norris', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-054-UN', (select id from public.products where code = 'APX-054'), 'Único', null, 5, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-054') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-054'), '/images/pilotos/norris.jpeg', 'Pôster Lando Norris', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-054'), 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=85', 'Pôster Lando Norris, ambiente', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-055-P', (select id from public.products where code = 'APX-055'), 'P', null, 0, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-055-M', (select id from public.products where code = 'APX-055'), 'M', null, 2, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-055-G', (select id from public.products where code = 'APX-055'), 'G', null, 4, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-055-GG', (select id from public.products where code = 'APX-055'), 'GG', null, 6, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-055') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-055'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Max Verstappen', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-055'), '/images/pilotos/verstappen.png', 'Max Verstappen', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-056-UN', (select id from public.products where code = 'APX-056'), 'Único', null, 7, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-056') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-056'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Verstappen', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-056'), '/images/pilotos/verstappen.png', 'Max Verstappen', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-057-UN', (select id from public.products where code = 'APX-057'), 'Único', null, 8, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-057') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-057'), 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=85', 'Miniatura de capacete Verstappen', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-057'), '/images/pilotos/verstappen.png', 'Max Verstappen', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-058-UN', (select id from public.products where code = 'APX-058'), 'Único', null, 9, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-058') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-058'), '/images/pilotos/verstappen.png', 'Pôster Max Verstappen', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-058'), 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=85', 'Pôster Max Verstappen, ambiente', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-059-P', (select id from public.products where code = 'APX-059'), 'P', null, 6, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-059-M', (select id from public.products where code = 'APX-059'), 'M', null, 8, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-059-G', (select id from public.products where code = 'APX-059'), 'G', null, 10, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-059-GG', (select id from public.products where code = 'APX-059'), 'GG', null, 0, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-059') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-059'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Lewis Hamilton', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-059'), '/images/pilotos/hamilton.png', 'Lewis Hamilton', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-060-UN', (select id from public.products where code = 'APX-060'), 'Único', null, 11, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-060') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-060'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Hamilton', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-060'), '/images/pilotos/hamilton.png', 'Lewis Hamilton', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-061-UN', (select id from public.products where code = 'APX-061'), 'Único', null, 12, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-061') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-061'), 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=85', 'Miniatura de capacete Hamilton', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-061'), '/images/pilotos/hamilton.png', 'Lewis Hamilton', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-062-UN', (select id from public.products where code = 'APX-062'), 'Único', null, 13, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-062') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-062'), '/images/pilotos/hamilton.png', 'Pôster Lewis Hamilton', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-062'), 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=85', 'Pôster Lewis Hamilton, ambiente', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-063-P', (select id from public.products where code = 'APX-063'), 'P', null, 0, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-063-M', (select id from public.products where code = 'APX-063'), 'M', null, 3, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-063-G', (select id from public.products where code = 'APX-063'), 'G', null, 5, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-063-GG', (select id from public.products where code = 'APX-063'), 'GG', null, 7, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-063') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-063'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Gabriel Bortoleto', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-063'), '/images/pilotos/bortoleto.png', 'Gabriel Bortoleto', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-064-UN', (select id from public.products where code = 'APX-064'), 'Único', null, 6, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-064') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-064'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Bortoleto', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-064'), '/images/pilotos/bortoleto.png', 'Gabriel Bortoleto', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-065-UN', (select id from public.products where code = 'APX-065'), 'Único', null, 7, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-065') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-065'), 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=85', 'Miniatura de capacete Bortoleto', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-065'), '/images/pilotos/bortoleto.png', 'Gabriel Bortoleto', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-066-UN', (select id from public.products where code = 'APX-066'), 'Único', null, 8, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-066') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-066'), '/images/pilotos/bortoleto.png', 'Pôster Gabriel Bortoleto', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-066'), 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=85', 'Pôster Gabriel Bortoleto, ambiente', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-007-P', (select id from public.products where code = 'APX-007'), 'P', null, 5, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-007-M', (select id from public.products where code = 'APX-007'), 'M', null, 7, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-007-G', (select id from public.products where code = 'APX-007'), 'G', null, 9, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-007-GG', (select id from public.products where code = 'APX-007'), 'GG', null, 0, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-007') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-007'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Ferrari 2026', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-007'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Camiseta Ferrari 2026 em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-008-UN', (select id from public.products where code = 'APX-008'), 'Único', null, 13, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-008') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-008'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Ferrari', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-008'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Boné Ferrari, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-009-P', (select id from public.products where code = 'APX-009'), 'P', null, 8, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-009-M', (select id from public.products where code = 'APX-009'), 'M', null, 10, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-009-G', (select id from public.products where code = 'APX-009'), 'G', null, 0, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-009-GG', (select id from public.products where code = 'APX-009'), 'GG', null, 3, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-009') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-009'), 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85', 'Moletom Ferrari', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-009'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Moletom Ferrari em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-010-P', (select id from public.products where code = 'APX-010'), 'P', null, 4, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-010-M', (select id from public.products where code = 'APX-010'), 'M', null, 6, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-010-G', (select id from public.products where code = 'APX-010'), 'G', null, 8, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-010-GG', (select id from public.products where code = 'APX-010'), 'GG', null, 10, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-010') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-010'), 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', 'Jaqueta Ferrari', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-010'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Jaqueta Ferrari, inspiração', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-011-P', (select id from public.products where code = 'APX-011'), 'P', null, 0, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-011-M', (select id from public.products where code = 'APX-011'), 'M', null, 2, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-011-G', (select id from public.products where code = 'APX-011'), 'G', null, 4, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-011-GG', (select id from public.products where code = 'APX-011'), 'GG', null, 6, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-011') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-011'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Mercedes 2026', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-011'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Camiseta Mercedes 2026 em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-012-UN', (select id from public.products where code = 'APX-012'), 'Único', null, 8, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-012') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-012'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Mercedes', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-012'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Boné Mercedes, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-013-P', (select id from public.products where code = 'APX-013'), 'P', null, 3, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-013-M', (select id from public.products where code = 'APX-013'), 'M', null, 5, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-013-G', (select id from public.products where code = 'APX-013'), 'G', null, 7, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-013-GG', (select id from public.products where code = 'APX-013'), 'GG', null, 9, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-013') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-013'), 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85', 'Moletom Mercedes', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-013'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Moletom Mercedes em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-014-P', (select id from public.products where code = 'APX-014'), 'P', null, 10, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-014-M', (select id from public.products where code = 'APX-014'), 'M', null, 0, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-014-G', (select id from public.products where code = 'APX-014'), 'G', null, 3, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-014-GG', (select id from public.products where code = 'APX-014'), 'GG', null, 5, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-014') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-014'), 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', 'Jaqueta Mercedes', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-014'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Jaqueta Mercedes, inspiração', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-015-P', (select id from public.products where code = 'APX-015'), 'P', null, 6, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-015-M', (select id from public.products where code = 'APX-015'), 'M', null, 8, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-015-G', (select id from public.products where code = 'APX-015'), 'G', null, 10, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-015-GG', (select id from public.products where code = 'APX-015'), 'GG', null, 0, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-015') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-015'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta McLaren 2026', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-015'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Camiseta McLaren 2026 em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-016-UN', (select id from public.products where code = 'APX-016'), 'Único', null, 12, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-016') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-016'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné McLaren', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-016'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Boné McLaren, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-017-P', (select id from public.products where code = 'APX-017'), 'P', null, 9, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-017-M', (select id from public.products where code = 'APX-017'), 'M', null, 0, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-017-G', (select id from public.products where code = 'APX-017'), 'G', null, 2, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-017-GG', (select id from public.products where code = 'APX-017'), 'GG', null, 4, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-017') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-017'), 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85', 'Moletom McLaren', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-017'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Moletom McLaren em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-018-P', (select id from public.products where code = 'APX-018'), 'P', null, 5, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-018-M', (select id from public.products where code = 'APX-018'), 'M', null, 7, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-018-G', (select id from public.products where code = 'APX-018'), 'G', null, 9, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-018-GG', (select id from public.products where code = 'APX-018'), 'GG', null, 0, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-018') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-018'), 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', 'Jaqueta McLaren', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-018'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Jaqueta McLaren, inspiração', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-019-P', (select id from public.products where code = 'APX-019'), 'P', null, 0, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-019-M', (select id from public.products where code = 'APX-019'), 'M', null, 3, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-019-G', (select id from public.products where code = 'APX-019'), 'G', null, 5, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-019-GG', (select id from public.products where code = 'APX-019'), 'GG', null, 7, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-019') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-019'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Red Bull Racing 2026', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-019'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Camiseta Red Bull Racing 2026 em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-020-UN', (select id from public.products where code = 'APX-020'), 'Único', null, 7, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-020') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-020'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Red Bull Racing', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-020'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Boné Red Bull Racing, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-021-P', (select id from public.products where code = 'APX-021'), 'P', null, 4, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-021-M', (select id from public.products where code = 'APX-021'), 'M', null, 6, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-021-G', (select id from public.products where code = 'APX-021'), 'G', null, 8, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-021-GG', (select id from public.products where code = 'APX-021'), 'GG', null, 10, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-021') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-021'), 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85', 'Moletom Red Bull Racing', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-021'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Moletom Red Bull Racing em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-022-P', (select id from public.products where code = 'APX-022'), 'P', null, 0, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-022-M', (select id from public.products where code = 'APX-022'), 'M', null, 2, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-022-G', (select id from public.products where code = 'APX-022'), 'G', null, 4, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-022-GG', (select id from public.products where code = 'APX-022'), 'GG', null, 6, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-022') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-022'), 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', 'Jaqueta Red Bull Racing', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-022'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Jaqueta Red Bull Racing, inspiração', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-023-P', (select id from public.products where code = 'APX-023'), 'P', null, 7, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-023-M', (select id from public.products where code = 'APX-023'), 'M', null, 9, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-023-G', (select id from public.products where code = 'APX-023'), 'G', null, 0, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-023-GG', (select id from public.products where code = 'APX-023'), 'GG', null, 2, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-023') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-023'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Aston Martin 2026', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-023'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Camiseta Aston Martin 2026 em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-024-UN', (select id from public.products where code = 'APX-024'), 'Único', null, 11, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-024') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-024'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Aston Martin', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-024'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Boné Aston Martin, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-025-P', (select id from public.products where code = 'APX-025'), 'P', null, 10, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-025-M', (select id from public.products where code = 'APX-025'), 'M', null, 0, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-025-G', (select id from public.products where code = 'APX-025'), 'G', null, 3, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-025-GG', (select id from public.products where code = 'APX-025'), 'GG', null, 5, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-025') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-025'), 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85', 'Moletom Aston Martin', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-025'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Moletom Aston Martin em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-026-P', (select id from public.products where code = 'APX-026'), 'P', null, 6, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-026-M', (select id from public.products where code = 'APX-026'), 'M', null, 8, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-026-G', (select id from public.products where code = 'APX-026'), 'G', null, 10, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-026-GG', (select id from public.products where code = 'APX-026'), 'GG', null, 0, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-026') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-026'), 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', 'Jaqueta Aston Martin', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-026'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Jaqueta Aston Martin, inspiração', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-027-P', (select id from public.products where code = 'APX-027'), 'P', null, 2, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-027-M', (select id from public.products where code = 'APX-027'), 'M', null, 4, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-027-G', (select id from public.products where code = 'APX-027'), 'G', null, 6, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-027-GG', (select id from public.products where code = 'APX-027'), 'GG', null, 8, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-027') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-027'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Williams 2026', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-027'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Camiseta Williams 2026 em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-028-UN', (select id from public.products where code = 'APX-028'), 'Único', null, 6, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-028') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-028'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Williams', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-028'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Boné Williams, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-029-P', (select id from public.products where code = 'APX-029'), 'P', null, 5, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-029-M', (select id from public.products where code = 'APX-029'), 'M', null, 7, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-029-G', (select id from public.products where code = 'APX-029'), 'G', null, 9, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-029-GG', (select id from public.products where code = 'APX-029'), 'GG', null, 0, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-029') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-029'), 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85', 'Moletom Williams', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-029'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Moletom Williams em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-030-P', (select id from public.products where code = 'APX-030'), 'P', null, 0, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-030-M', (select id from public.products where code = 'APX-030'), 'M', null, 3, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-030-G', (select id from public.products where code = 'APX-030'), 'G', null, 5, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-030-GG', (select id from public.products where code = 'APX-030'), 'GG', null, 7, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-030') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-030'), 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', 'Jaqueta Williams', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-030'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Jaqueta Williams, inspiração', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-031-P', (select id from public.products where code = 'APX-031'), 'P', null, 8, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-031-M', (select id from public.products where code = 'APX-031'), 'M', null, 10, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-031-G', (select id from public.products where code = 'APX-031'), 'G', null, 0, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-031-GG', (select id from public.products where code = 'APX-031'), 'GG', null, 3, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-031') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-031'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Alpine 2026', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-031'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Camiseta Alpine 2026 em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-032-UN', (select id from public.products where code = 'APX-032'), 'Único', null, 10, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-032') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-032'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Alpine', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-032'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Boné Alpine, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-033-P', (select id from public.products where code = 'APX-033'), 'P', null, 0, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-033-M', (select id from public.products where code = 'APX-033'), 'M', null, 2, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-033-G', (select id from public.products where code = 'APX-033'), 'G', null, 4, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-033-GG', (select id from public.products where code = 'APX-033'), 'GG', null, 6, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-033') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-033'), 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85', 'Moletom Alpine', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-033'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Moletom Alpine em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-034-P', (select id from public.products where code = 'APX-034'), 'P', null, 7, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-034-M', (select id from public.products where code = 'APX-034'), 'M', null, 9, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-034-G', (select id from public.products where code = 'APX-034'), 'G', null, 0, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-034-GG', (select id from public.products where code = 'APX-034'), 'GG', null, 2, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-034') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-034'), 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', 'Jaqueta Alpine', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-034'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Jaqueta Alpine, inspiração', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-035-P', (select id from public.products where code = 'APX-035'), 'P', null, 3, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-035-M', (select id from public.products where code = 'APX-035'), 'M', null, 5, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-035-G', (select id from public.products where code = 'APX-035'), 'G', null, 7, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-035-GG', (select id from public.products where code = 'APX-035'), 'GG', null, 9, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-035') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-035'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Haas 2026', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-035'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Camiseta Haas 2026 em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-036-UN', (select id from public.products where code = 'APX-036'), 'Único', null, 5, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-036') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-036'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Haas', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-036'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Boné Haas, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-037-P', (select id from public.products where code = 'APX-037'), 'P', null, 6, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-037-M', (select id from public.products where code = 'APX-037'), 'M', null, 8, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-037-G', (select id from public.products where code = 'APX-037'), 'G', null, 10, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-037-GG', (select id from public.products where code = 'APX-037'), 'GG', null, 0, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-037') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-037'), 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85', 'Moletom Haas', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-037'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Moletom Haas em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-038-P', (select id from public.products where code = 'APX-038'), 'P', null, 2, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-038-M', (select id from public.products where code = 'APX-038'), 'M', null, 4, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-038-G', (select id from public.products where code = 'APX-038'), 'G', null, 6, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-038-GG', (select id from public.products where code = 'APX-038'), 'GG', null, 8, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-038') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-038'), 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', 'Jaqueta Haas', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-038'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Jaqueta Haas, inspiração', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-039-P', (select id from public.products where code = 'APX-039'), 'P', null, 9, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-039-M', (select id from public.products where code = 'APX-039'), 'M', null, 0, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-039-G', (select id from public.products where code = 'APX-039'), 'G', null, 2, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-039-GG', (select id from public.products where code = 'APX-039'), 'GG', null, 4, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-039') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-039'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Racing Bulls 2026', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-039'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Camiseta Racing Bulls 2026 em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-040-UN', (select id from public.products where code = 'APX-040'), 'Único', null, 9, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-040') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-040'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Racing Bulls', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-040'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Boné Racing Bulls, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-041-P', (select id from public.products where code = 'APX-041'), 'P', null, 0, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-041-M', (select id from public.products where code = 'APX-041'), 'M', null, 3, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-041-G', (select id from public.products where code = 'APX-041'), 'G', null, 5, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-041-GG', (select id from public.products where code = 'APX-041'), 'GG', null, 7, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-041') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-041'), 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85', 'Moletom Racing Bulls', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-041'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Moletom Racing Bulls em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-042-P', (select id from public.products where code = 'APX-042'), 'P', null, 8, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-042-M', (select id from public.products where code = 'APX-042'), 'M', null, 10, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-042-G', (select id from public.products where code = 'APX-042'), 'G', null, 0, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-042-GG', (select id from public.products where code = 'APX-042'), 'GG', null, 3, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-042') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-042'), 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', 'Jaqueta Racing Bulls', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-042'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Jaqueta Racing Bulls, inspiração', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-043-P', (select id from public.products where code = 'APX-043'), 'P', null, 4, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-043-M', (select id from public.products where code = 'APX-043'), 'M', null, 6, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-043-G', (select id from public.products where code = 'APX-043'), 'G', null, 8, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-043-GG', (select id from public.products where code = 'APX-043'), 'GG', null, 10, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-043') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-043'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Audi 2026', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-043'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Camiseta Audi 2026 em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-044-UN', (select id from public.products where code = 'APX-044'), 'Único', null, 13, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-044') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-044'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Audi', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-044'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Boné Audi, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-045-P', (select id from public.products where code = 'APX-045'), 'P', null, 7, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-045-M', (select id from public.products where code = 'APX-045'), 'M', null, 9, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-045-G', (select id from public.products where code = 'APX-045'), 'G', null, 0, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-045-GG', (select id from public.products where code = 'APX-045'), 'GG', null, 2, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-045') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-045'), 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85', 'Moletom Audi', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-045'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Moletom Audi em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-046-P', (select id from public.products where code = 'APX-046'), 'P', null, 3, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-046-M', (select id from public.products where code = 'APX-046'), 'M', null, 5, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-046-G', (select id from public.products where code = 'APX-046'), 'G', null, 7, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-046-GG', (select id from public.products where code = 'APX-046'), 'GG', null, 9, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-046') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-046'), 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', 'Jaqueta Audi', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-046'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Jaqueta Audi, inspiração', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-047-P', (select id from public.products where code = 'APX-047'), 'P', null, 10, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-047-M', (select id from public.products where code = 'APX-047'), 'M', null, 0, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-047-G', (select id from public.products where code = 'APX-047'), 'G', null, 3, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-047-GG', (select id from public.products where code = 'APX-047'), 'GG', null, 5, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-047') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-047'), 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', 'Camiseta Cadillac 2026', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-047'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Camiseta Cadillac 2026 em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-048-UN', (select id from public.products where code = 'APX-048'), 'Único', null, 8, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-048') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-048'), 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85', 'Boné Cadillac', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-048'), 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85', 'Boné Cadillac, detalhe', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-049-P', (select id from public.products where code = 'APX-049'), 'P', null, 2, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-049-M', (select id from public.products where code = 'APX-049'), 'M', null, 4, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-049-G', (select id from public.products where code = 'APX-049'), 'G', null, 6, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-049-GG', (select id from public.products where code = 'APX-049'), 'GG', null, 8, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-049') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-049'), 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85', 'Moletom Cadillac', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-049'), 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85', 'Moletom Cadillac em uso', true, 1);
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-050-P', (select id from public.products where code = 'APX-050'), 'P', null, 9, 0) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-050-M', (select id from public.products where code = 'APX-050'), 'M', null, 0, 1) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-050-G', (select id from public.products where code = 'APX-050'), 'G', null, 2, 2) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
insert into public.product_variants (sku, product_id, size, color, stock, position) values ('APX-050-GG', (select id from public.products where code = 'APX-050'), 'GG', null, 4, 3) on conflict (sku) do update set product_id = excluded.product_id, size = excluded.size, color = excluded.color, stock = excluded.stock, position = excluded.position;
delete from public.product_images where product_id = (select id from public.products where code = 'APX-050') and storage_path is null;
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-050'), 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', 'Jaqueta Cadillac', false, 0);
insert into public.product_images (product_id, src, alt, illustrative, position) values ((select id from public.products where code = 'APX-050'), 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png', 'Jaqueta Cadillac, inspiração', true, 1);
commit;

-- =====================================================================================================
-- Administradores do painel: troque pelo(s) seu(s) e-mail(s) (em minúsculas) e rode esta linha.
-- =====================================================================================================
-- insert into public.admin_emails (email) values ('seu-email@exemplo.com') on conflict do nothing;
