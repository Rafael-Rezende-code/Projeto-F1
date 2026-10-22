# Painel admin: como ativar (fase 11)

`/admin` está pronto e **desligado**: sem Supabase, qualquer rota do painel mostra só como ativar. Com o Supabase
configurado (docs/backend/supabase.md):

- **Entrada:** `/admin/entrar` envia um link mágico por e-mail (sem senha) via Supabase Auth, só para e-mails de
  `ADMIN_EMAILS`. O link volta em `/admin/entrar/callback`. A sessão é renovada pelo `proxy.ts` (só em `/admin`).
- **Produtos** (`/admin/produtos`): listar, buscar (nome, slug, código), filtrar por status, criar, editar
  (nome, slug, descrição, preço e preço "de" em reais, categoria, equipe, piloto, tags, selo Novo, destaque, status
  rascunho/publicado/arquivado, variantes com SKU/tamanho/cor/estoque, ficha, fotos com envio para o Storage) e arquivar.
  Ao salvar, o cache do catálogo é limpo e as páginas da loja são revalidadas.
- **Pedidos** (`/admin/pedidos`): listar, filtrar por status, ver o detalhe (itens, cliente, entrega, pagamento) e
  marcar como enviado com o código de rastreio (só pedidos pagos).
- Fora dos buscadores: `noindex` (metadata e cabeçalho `X-Robots-Tag`), `Disallow: /admin` no robots.txt e fora do sitemap.
  O dock do celular não aparece no painel.

## Duas travas de acesso

1. **App:** o e-mail da sessão precisa estar em `ADMIN_EMAILS` (variável de ambiente, separada por vírgula).
2. **Banco:** o RLS só deixa ler pedidos e gravar catálogo/Storage se o e-mail do JWT estiver na tabela `admin_emails`.

Mantenha as duas listas iguais. Para tirar alguém: remova dos dois lugares e apague o usuário em Authentication → Users.

## Passo a passo

1. Supabase configurado (migração, seed e variáveis) — docs/backend/supabase.md.
2. `insert into admin_emails (email) values ('voce@sua-loja.com.br');` no SQL Editor.
3. `ADMIN_EMAILS=voce@sua-loja.com.br` na Vercel e no `.env.local`.
4. Authentication → Users → *Add user* → *Send invitation* (ou *Create new user*) com o mesmo e-mail. O cadastro
   aberto deve ficar desligado (o painel não cria usuários: `shouldCreateUser: false`).
5. Authentication → URL Configuration: *Site URL* = URL do site; *Redirect URLs* inclui
   `https://<seu-dominio>/admin/entrar/callback` (e `http://localhost:3000/admin/entrar/callback` para testar local).
6. Deploy. Entre em `/admin/entrar`, informe o e-mail e clique no link recebido.

## Fotos

Enviadas do navegador direto para o bucket `produtos` do Storage (o RLS só aceita administradores), até 8 MB cada,
em `<slug>/<data>-<nome>.<ext>`. A URL pública vai para `product_images`. O `next.config.mjs` libera o host do
Supabase no `next/image` quando `NEXT_PUBLIC_SUPABASE_URL` existe. Remover uma foto do produto não apaga o arquivo do
Storage (pode estar em uso em pedidos ou cache); limpe pelo painel do Supabase se precisar.

## Não testado nesta sessão

O painel foi verificado no modo desligado (sem Supabase). O fluxo logado não foi exercitado contra um projeto real
(sem credenciais). As regras de acesso do banco (RLS) estão cobertas por `supabase/tests/loja.test.ts`.
