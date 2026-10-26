-- Curadoria da vitrine (refino 3, itens 1.2 e 1.3). Idempotente pelo gerador (add column / create or replace).
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
  add column bestseller_manual boolean not null default false,
  add column bestseller_rank integer check (bestseller_rank is null or (bestseller_rank between 1 and 9999)),
  add column new_until date;

create index products_bestseller_idx on public.products (bestseller_rank) where bestseller_manual;

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
