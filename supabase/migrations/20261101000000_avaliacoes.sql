-- Avaliações de produto (refino 3, item 2.5). DESLIGADAS no site por padrão (NEXT_PUBLIC_REVIEWS_ENABLED). Nenhum dado de
-- exemplo é criado aqui (nem no seed).
--
-- Quem avalia: o cliente de um pedido ENTREGUE, pela consulta de pedido (/pedido/consultar: número + e-mail), uma
-- avaliação por produto do pedido. A gravação passa SÓ pela função submit_review (service role, chamada pelo servidor
-- depois do limite por IP), que confere pedido + e-mail + status + produto e grava como PENDENTE.
-- Quem lê: o público só vê as APROVADAS e só as colunas de exibição (sem pedido nem moderação). Moderação (aprovar ou
-- rejeitar) e leitura completa: só administradores (RLS + is_admin()).
create table public.reviews (
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
create index reviews_product_idx on public.reviews (product_slug, status, created_at desc);
create index reviews_status_idx on public.reviews (status, created_at);

alter table public.reviews enable row level security;
revoke all on table public.reviews from anon, authenticated, public;
-- Público (chave anon, sem login): só as colunas de exibição. Logado (authenticated) só lê pelo RLS de administrador.
grant select (id, product_slug, rating, title, body, display_name, created_at, status) on public.reviews to anon;
grant select, update, delete on public.reviews to authenticated;

create policy "avaliacoes aprovadas sao publicas" on public.reviews for select to anon using (status = 'aprovada');
create policy "admin le avaliacoes" on public.reviews for select to authenticated using (public.is_admin());
create policy "admin modera avaliacoes" on public.reviews for update to authenticated using (public.is_admin()) with check (public.is_admin());
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
