# Supabase: como ativar

O código está pronto e **desligado**. Sem as variáveis de ambiente, o site usa o catálogo do seed (`lib/catalog/seed/`)
e os pedidos continuam simulados, exatamente como antes. Com elas:

- o catálogo passa a vir do banco (`lib/catalog/supabase-repository.ts`, mesma interface `CatalogRepository`);
- cada pedido é gravado e o estoque é baixado **na mesma transação** (função SQL `create_order`), antes da cobrança;
- a página do pedido (`/pedido/[id]?t=<chave>`) lê do banco, em qualquer aparelho;
- o painel `/admin` (fase 11) passa a funcionar.

> **⚠️ `supabase/setup-completo.sql`: Contém o seed de demonstração: reaplicar repõe produtos de teste e estoque. NÃO rode
> de novo depois de cadastrar produtos reais.** Banco que já está no ar: rode só `supabase/atualizacao-2.sql` (abaixo).

## O que está no repositório

| Arquivo | O quê |
| --- | --- |
| **`supabase/setup-completo.sql`** | **Tudo num arquivo só** (migrations + seed), reexecutável: é o que você cola no SQL Editor. Gerado por `pnpm supabase:setup` |
| **`supabase/atualizacao-2.sql`** | **Só as migrations novas** (depois de `20261025000000`), SEM seed: é o que se roda no banco que já está ativo. Reexecutável. Gerado junto pelo `pnpm supabase:setup` |
| `supabase/migrations/20261026000000_cupons.sql` | Cupons (`coupons`, `coupon_redemptions`), colunas de desconto em `orders`, `quote_coupon`, `create_order` com cupom (uso contado na mesma transação) e `release_order_stock` devolvendo o uso |
| `supabase/migrations/20261027000000_consulta_e_limites.sql` | Limite de tentativas por IP centralizado (`rate_limit_hits`, `rate_limit_hit`) e a consulta de pedido `lookup_order` (só o servidor executa) |
| `supabase/migrations/20261028000000_eventos_e_cancelamento.sql` | Histórico do pedido (`order_events`, por gatilhos), `cancel_order` e `mark_order_refunded` (transacionais, só admin/servidor), `orders.is_test` e `admin_dashboard` |
| `supabase/migrations/20261022000000_loja.sql` | Tabelas (categorias, equipes, pilotos, produtos, variantes, imagens, clientes, pedidos, itens, eventos de pagamento, e-mails de admin), RLS, funções `create_order` / `release_order_stock` / `is_admin` e o bucket `produtos` |
| `supabase/migrations/20261025000000_newsletter.sql` | Lista da newsletter (`newsletter_subscribers`): inserção pública limitada, leitura só do admin (ver `docs/backend/newsletter.md`) |
| `supabase/migrations/20261023000000_modelo_de_venda.sql` | Modelo de venda (sob encomenda, prazos, origem, pacote), tabela privada `product_private`, status por item do pedido |
| `supabase/seed.sql` | Catálogo atual em SQL (gerado por `pnpm supabase:seed`) |
| `scripts/supabase/seed.ts` | Gera o `seed.sql` ou grava direto no projeto (`--push`) |
| `supabase/tests/loja.test.ts` | Testes da migração + seed num Postgres em memória (estoque, RLS) — rodam no `pnpm test` |
| `supabase/tests/setup-completo.test.ts` | Roda o `setup-completo.sql` DUAS vezes num Postgres limpo e confere o catálogo e o modelo de venda |
| `lib/supabase/` | Configuração (variáveis) e clientes do servidor |
| `lib/catalog/supabase-repository.ts` | Catálogo do banco (cache de 60 s; estoque do checkout sempre lido na hora) |
| `lib/orders/` | Pedidos gravados (criar, ler com a chave do cliente, registrar pagamento, devolver estoque) |

## Passo a passo

1. **Criar o projeto** em https://supabase.com (região São Paulo, `sa-east-1`). Guarde a senha do banco.
2. **Rodar o setup completo (um arquivo só).** Painel do projeto → **SQL Editor** → **New query** → abra
   `supabase/setup-completo.sql`, copie TUDO, cole e clique em **Run**. Ele cria as tabelas, as políticas de segurança
   (RLS), as funções, o bucket de fotos `produtos` e carrega o catálogo de demonstração (66 produtos: alguns **sob
   encomenda**, com prazo e origem, o resto em **estoque próprio**). Deve terminar com "Success. No rows returned".
   - Pode rodar de novo sem erro (só cria o que falta e atualiza o catálogo do seed), mas **rodar de novo devolve o
     estoque dos produtos do seed aos valores de exemplo**. Depois que a loja estiver vendendo, rode só migrations novas.
   - **Banco já ativo (atualização 2):** SQL Editor → New query → cole TODO o `supabase/atualizacao-2.sql` → Run. Não
     tem seed (não mexe em produtos nem estoque) e pode rodar de novo. Testado só no PGlite (Postgres em memória),
     **não contra o Supabase real**.
   - Alternativa pela CLI: `supabase link --project-ref <ref>`, `supabase db push` (migrations) e, para o catálogo,
     `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/supabase/seed.ts --push`.
3. **Conferir.** Table Editor → `products` deve ter 66 linhas; a coluna `fulfillment` mostra `estoque_proprio` e
   `sob_encomenda`. Os produtos entram como `illustrative` (demonstração), com fichas a conferir: troque pelos reais no
   painel admin (ou pelo importador CSV).
4. **Cadastrar quem administra:** no fim do arquivo há a linha comentada; no SQL Editor rode
   `insert into public.admin_emails (email) values ('voce@sua-loja.com.br') on conflict do nothing;` (sempre em
   minúsculas).
5. **Variáveis de ambiente** (Project Settings → API), no `.env.local` e na Vercel (Production e Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role (secreta; só servidor)
   - `ADMIN_EMAILS` = os mesmos e-mails do passo 4
5b. **Conferir tudo com um comando:** `pnpm supabase:ativar` (lê o `.env.local`; **nunca imprime chaves**). Relatório em
   português: (a) conexão e se as chaves anon/service_role não estão trocadas; (b) tabelas, funções, bucket e quantos
   registros o seed trouxe (aponta o que falta); (c) insere em `admin_emails` cada e-mail de `ADMIN_EMAILS` (idempotente);
   (d) com a chave pública: o catálogo é legível, a tabela privada de custo e fornecedor NÃO é, e nenhuma escrita é
   permitida (nem enviar foto, nem criar pedido); (e) a baixa de estoque com um pedido de teste (inclusive estoque
   insuficiente), tudo apagado no fim; (f) o importador com o `docs/modelos/produtos-exemplo.csv`, sem login manual (cria um
   administrador temporário), conferindo que custo e fornecedor ficam só na tabela privada e depois apagando tudo.
   `pnpm supabase:ativar --sem-importador` pula o item (f). Se faltar alguma variável, ele diz QUAL (não pede o valor).
   Roteiro do que só você consegue testar (o clique no e-mail): `docs/backend/roteiro-teste-admin.md`.
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

## Ao criar uma migration nova

1. Crie `supabase/migrations/AAAAMMDDHHMMSS_nome.sql` (nunca altere as já aplicadas).
2. Rode `pnpm supabase:setup`: regera o `seed.sql` e o `setup-completo.sql` (o teste `setup-completo.test.ts` falha
   se o arquivo ficar desatualizado).
3. No projeto que já está no ar, cole **só a migration nova** no SQL Editor.
