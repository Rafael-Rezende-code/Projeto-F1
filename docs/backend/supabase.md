# Supabase: como ativar (fase 9)

O código está pronto e **desligado**. Sem as variáveis de ambiente, o site usa o catálogo do seed (`lib/catalog/seed/`)
e os pedidos continuam simulados, exatamente como antes. Com elas:

- o catálogo passa a vir do banco (`lib/catalog/supabase-repository.ts`, mesma interface `CatalogRepository`);
- cada pedido é gravado e o estoque é baixado **na mesma transação** (função SQL `create_order`), antes da cobrança;
- a página do pedido (`/pedido/[id]?t=<chave>`) lê do banco, em qualquer aparelho;
- o painel `/admin` (fase 11) passa a funcionar.

## O que está no repositório

| Arquivo | O quê |
| --- | --- |
| `supabase/migrations/20261022000000_loja.sql` | Tabelas (categorias, equipes, pilotos, produtos, variantes, imagens, clientes, pedidos, itens, eventos de pagamento, e-mails de admin), RLS, funções `create_order` / `release_order_stock` / `is_admin` e o bucket `produtos` |
| `supabase/seed.sql` | Catálogo atual em SQL (gerado por `pnpm supabase:seed`) |
| `scripts/supabase/seed.ts` | Gera o `seed.sql` ou grava direto no projeto (`--push`) |
| `supabase/tests/loja.test.ts` | Testes da migração + seed num Postgres em memória (estoque, RLS) — rodam no `pnpm test` |
| `lib/supabase/` | Configuração (variáveis) e clientes do servidor |
| `lib/catalog/supabase-repository.ts` | Catálogo do banco (cache de 60 s; estoque do checkout sempre lido na hora) |
| `lib/orders/` | Pedidos gravados (criar, ler com a chave do cliente, registrar pagamento, devolver estoque) |

## Passo a passo

1. **Criar o projeto** em https://supabase.com (região São Paulo, `sa-east-1`). Guarde a senha do banco.
2. **Rodar a migração.** Escolha um:
   - Painel → SQL Editor → cole o conteúdo de `supabase/migrations/20261022000000_loja.sql` → Run; ou
   - Supabase CLI: `supabase link --project-ref <ref>` e `supabase db push`.
3. **Carregar o catálogo.** Escolha um:
   - SQL Editor → cole `supabase/seed.sql` → Run; ou
   - `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/supabase/seed.ts --push` (com as variáveis do
     passo 5 no `.env.local`).
   Os produtos entram como `illustrative` (demonstração), com fichas a conferir. Troque pelos reais no painel admin.
   **Atenção:** rodar o seed de novo volta o estoque das variantes do seed ao valor original.
4. **Cadastrar quem administra:** SQL Editor →
   `insert into admin_emails (email) values ('voce@sua-loja.com.br');` (sempre em minúsculas).
5. **Variáveis de ambiente** (Project Settings → API), no `.env.local` e na Vercel (Production e Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role (secreta; só servidor)
   - `ADMIN_EMAILS` = os mesmos e-mails do passo 4
6. **Login do admin (Auth):** Authentication → Providers → Email (ligado). Em Authentication → URL Configuration,
   coloque a URL do site em *Site URL* e `https://<seu-dominio>/admin/entrar/callback` em *Redirect URLs* (o painel
   usa link mágico por e-mail). Desligue o cadastro aberto (Authentication → Sign In / Up → *Allow new users to sign
   up*: desligado) e crie os usuários admin em Authentication → Users → Add user.
7. **Deploy.** As páginas do catálogo são geradas no build; o painel admin chama `revalidatePath` depois de salvar.

## Como funciona o pedido

1. O checkout valida tudo no servidor e confere preço/estoque.
2. `create_order` (service role) baixa o estoque de cada SKU com `UPDATE ... WHERE stock >= quantidade` (trava a linha;
   compras simultâneas nunca passam do estoque), grava cliente, pedido e itens e devolve o total **calculado pelo banco**.
   Faltou estoque em algum item → nada é gravado e o cliente vê quais itens faltam.
3. O provedor de pagamento é chamado com esse total.
4. Recusado/erro → pedido cancelado e estoque devolvido (`release_order_stock`, idempotente). Pix/boleto → "aguardando
   pagamento" até o webhook (fase 10).
5. O cliente vai para `/pedido/<id>?t=<chave>`: a chave (`access_token`) é o que dá acesso ao pedido.

## Segurança (RLS)

- Catálogo: leitura pública só de produtos `active` (e das variantes/imagens deles); escrita só para e-mails em
  `admin_emails` (via `is_admin()`, que lê o e-mail do JWT do Supabase Auth).
- Pedidos, clientes e itens: nenhum acesso público. Admin lê e atualiza (marcar como enviado). Criar pedido e devolver
  estoque só pela service role.
- Storage `produtos`: leitura pública; envio/alteração/remoção só admin.

## Pendências conhecidas

- Pix/boleto não pagos ficam "aguardando pagamento" até o Mercado Pago avisar o vencimento (`cancelled`), quando o
  estoque volta. Se quiser liberar antes, crie uma rotina (cron) que cancele pedidos antigos sem pagamento.
- E-mails transacionais (confirmação, envio) não estão implementados: precisam de um serviço de e-mail (Resend, etc.).
