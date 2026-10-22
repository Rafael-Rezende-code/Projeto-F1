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

## Venda, custo e fornecedor (refino 2)

- **Venda e envio** (no formulário do produto, público): estoque próprio ou sob encomenda, prazo de envio em dias úteis
  (mínimo e máximo), origem (nacional/importado), peso e medidas da embalagem (para o frete).
- **Custo e fornecedor** (privado, tabela `product_private`, só admin pelo RLS): custo, frete do fornecedor, link do
  fornecedor e notas. Nunca aparece na loja.
- **Calculadora de preço**: custo + frete do fornecedor + taxa do pagamento (% e fixa) + impostos (%) + margem desejada →
  preço sugerido (arredondado para ,90) e margem líquida do preço atual. Os parâmetros são editáveis e ficam salvos no
  navegador de quem administra. Os valores iniciais (4,99% de taxa, 0% de impostos, 35% de margem) são EXEMPLO: confira
  com o contrato do Mercado Pago e com o contador. O preço só muda ao clicar em "Usar o preço sugerido".
- **Comprar no fornecedor** (`/admin/fornecedor`): itens sob encomenda de pedidos PAGOS, mais antigos primeiro. Para cada
  um: "Abrir no fornecedor" (link do produto), "Copiar endereço e dados" (nome, endereço, CEP, telefone e e-mail do
  cliente), rastreio do fornecedor e "Marcar comprado". A compra é manual: nada é automatizado nem lido do marketplace.
  O CPF do cliente não é guardado (só vai ao provedor no boleto); se o fornecedor exigir, peça ao cliente.
- **Marcar como enviado** (detalhe do pedido): grava o rastreio do pedido e passa os itens já separados/comprados para
  "enviado" com o mesmo código.

## Não testado nesta sessão

O painel foi verificado no modo desligado (sem Supabase). O fluxo logado não foi exercitado contra um projeto real
(sem credenciais). As regras de acesso do banco (RLS) estão cobertas por `supabase/tests/loja.test.ts`.
