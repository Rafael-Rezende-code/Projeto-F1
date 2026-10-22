-- Newsletter (feat/carros, item 3): e-mails de quem se inscreveu na seção "Fique no grid" da home.
--
-- Inscrição PÚBLICA E LIMITADA: a chave pública (anon) só consegue INSERIR, e só as 5 colunas abaixo; não lê, não altera,
-- não apaga. O CONSENTIMENTO é obrigatório (check) e o texto exato que o visitante viu fica gravado junto (consent_text).
-- Limites no próprio banco (gatilho): no máximo 5 inscrições por IP (hash) por hora e 300 no total por hora. O IP nunca é
-- guardado: o servidor grava só um hash com sal (ip_hash). Leitura, edição e exclusão: só administradores (RLS + is_admin()).
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) between 5 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  consent boolean not null check (consent),
  consent_text text not null check (char_length(consent_text) between 10 and 600),
  source text not null default 'site' check (char_length(source) between 1 and 40),
  ip_hash text check (ip_hash is null or char_length(ip_hash) between 16 and 128),
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);
create index newsletter_ip_idx on public.newsletter_subscribers (ip_hash, created_at);

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
create trigger newsletter_limits before insert on public.newsletter_subscribers for each row execute function public.newsletter_limits();

alter table public.newsletter_subscribers enable row level security;

-- Permissões de coluna: o visitante só insere (e só estas colunas: não escolhe id, data nem descadastro).
revoke all on table public.newsletter_subscribers from anon, authenticated, public;
grant insert (email, consent, consent_text, source, ip_hash) on public.newsletter_subscribers to anon, authenticated;
grant select, update, delete on public.newsletter_subscribers to authenticated;

create policy "inscricao publica" on public.newsletter_subscribers for insert to anon, authenticated
  with check (consent = true and unsubscribed_at is null);
create policy "admin le" on public.newsletter_subscribers for select to authenticated using (public.is_admin());
create policy "admin altera" on public.newsletter_subscribers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin apaga" on public.newsletter_subscribers for delete to authenticated using (public.is_admin());
