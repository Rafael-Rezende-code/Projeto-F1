-- Apex: ATUALIZAÇÃO 3 do Supabase (gerado por scripts/supabase/setup-completo.mjs; NÃO editar à mão).
-- Para o banco que JÁ ESTÁ NO AR (já recebeu o setup completo até 20261029000000 e as atualizações anteriores (2)). NÃO contém seed: não mexe em produtos
-- nem em estoque. Pode rodar mais de uma vez. Cole tudo no SQL Editor e clique em Run (docs/backend/supabase.md).
--
-- Contém, nesta ordem: 20261030000000_curadoria.sql, 20261031000000_avise_me.sql, 20261101000000_avaliacoes.sql.

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
