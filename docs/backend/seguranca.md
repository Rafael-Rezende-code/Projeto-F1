# Segurança da loja

Resumo do que protege a loja hoje, como conferir e o que ainda falta. Nada aqui foi testado contra o Supabase real (sem
credenciais nesta sessão); as regras do banco foram testadas no PGlite (Postgres em memória) e as do servidor com testes
automáticos.

## 1. Cabeçalhos HTTP (todas as respostas)

Definidos em `lib/security-headers.mjs` e aplicados pelo `next.config.mjs` (teste: `lib/security-headers.test.ts`):

| Cabeçalho | Valor | Para quê |
| --- | --- | --- |
| `X-Content-Type-Options` | `nosniff` | o navegador não "adivinha" o tipo de um arquivo |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | sites externos só veem o domínio, não a URL (a do pedido leva a chave `?t=`) |
| `Permissions-Policy` | câmera, microfone, localização, USB etc. desligados | nenhum script pode pedir esses recursos |
| `X-Frame-Options` | `SAMEORIGIN` | ninguém coloca a loja dentro de um iframe (clickjacking) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (só produção) | o navegador só usa https |

Conferir em produção: `curl -sI https://SEU-DOMINIO/ | grep -iE "nosniff|referrer|permissions|frame|strict"`.

**Melhoria futura: Content-Security-Policy (CSP).** Não aplicada de propósito: o site usa scripts inline (fonte do hero,
GA4, Meta Pixel) e o Mercado Pago Brick carrega scripts e iframes de vários domínios; uma CSP errada quebra o checkout
sem aviso. Caminho seguro: publicar primeiro como `Content-Security-Policy-Report-Only` com nonce (o Next 16 gera nonce
pelo `proxy.ts`), acompanhar os relatórios por algumas semanas e só então trocar para a versão que bloqueia.

## 2. Limite de tentativas por IP

Um só mecanismo, no banco (`rate_limit_hit`, migração `20261027000000_consulta_e_limites.sql`; servidor em
`lib/rate-limit.ts`, limites em `lib/rate-limit-config.ts`). O IP nunca é gravado: só um hash com sal (`RATE_LIMIT_SALT`,
ou `NEWSLETTER_IP_SALT`).

| Ação | Limite padrão |
| --- | --- |
| Finalizar pedido (`placeOrder`) | 10 a cada 10 min |
| Cupom (prévia) | 20 a cada 10 min |
| Consultar pedido | 8 a cada 15 min |
| Newsletter | 5 por hora (e o gatilho próprio da tabela: 5 por IP e 300 no total por hora) |

Sem Supabase (modo simulado) não há limite. Se o banco falhar na contagem, a ação segue (registrado no log).

## 3. Painel admin

Duas travas independentes: `ADMIN_EMAILS` no servidor (`requireAdmin`, `lib/admin/auth.ts`) e `admin_emails` + RLS
(`is_admin()`) no banco. O teste `app/admin/autorizacao.test.ts` descobre sozinho TODAS as ações, rotas e páginas de
`app/admin` e confere que, sem sessão e com sessão de um e-mail comum, cada uma manda para `/admin/entrar` **sem tocar
no banco**. Arquivo novo entra no teste automaticamente. Hoje (14 ações/rotas + 12 páginas):

- Ações: `saveCoupon`, `setCouponActive`, `markPurchased`, `markShipped`, `cancelOrder`, `markRefunded`, `setOrderTest`,
  `saveProduct`, `setProductStatus`, `previewImport`, `runImport`.
- Rotas: `GET /admin/fornecedor/exportar`, `GET /admin/newsletter/exportar`, `GET /admin/pedidos/exportar`.
- Páginas: início, cupons (lista, novo, editar), fornecedor, newsletter, pedidos (lista, detalhe), produtos (lista,
  novo, editar, importar).
- Públicas de propósito: `/admin/entrar` (o link mágico só sai para `ADMIN_EMAILS`, e a resposta é a mesma para
  qualquer e-mail), o retorno do link (`/admin/entrar/callback`), `/admin/sair` e o modelo VAZIO da planilha
  (`/admin/produtos/importar/modelo`).

O teste achou e corrigiu um problema: no importador, o `try/catch` engolia o redirecionamento do `requireAdmin` (quem
não era admin recebia uma mensagem de erro em vez de ir ao login; o banco não era tocado).

## 4. Banco (RLS e funções)

| Dado | Chave pública (anon) | Admin logado | Servidor (service role) |
| --- | --- | --- | --- |
| Catálogo (produtos, variantes, fotos) | lê | lê e grava | tudo |
| Custo e fornecedor (`product_private`) | nada | lê e grava | tudo |
| Pedidos, itens, clientes, pagamentos | nada | lê e atualiza | tudo |
| Newsletter | só insere (com consentimento) | lê, altera, apaga | tudo |
| Cupons e usos | nada (só a prévia `quote_coupon`, que devolve o resultado do código digitado) | tudo | tudo |
| Histórico (`order_events`), e-mails (`email_log`) | nada | lê | tudo |
| Limites (`rate_limit_hits`) | nada | nada | tudo |

Escritas sensíveis em funções SQL transacionais: `create_order` (estoque + cupom), `cancel_order` e
`release_order_stock` (devolvem estoque e cupom uma vez só), `mark_order_refunded`, `import_products`,
`claim_order_email`. Testes: `supabase/tests/*.test.ts`.

**Conferir no projeto real:** `pnpm supabase:ativar` (com o `.env.local`). A parte "d) Chave pública" tenta ler, com a
chave anon, `product_private`, pedidos, clientes, newsletter, cupons, usos, histórico, e-mails e limites (qualquer linha
legível = FALHOU) e chamar `create_order`, `cancel_order`, `mark_order_refunded`, `admin_dashboard`, `lookup_order`,
`rate_limit_hit`, `claim_order_email`, `log_order_event`, `release_order_stock` e `import_products` (tem que dar
"bloqueada"). Rodar depois de cada `atualizacao-*.sql`.

## 5. Outros cuidados já no código

- Preço, estoque, frete e cupom recalculados no servidor e no banco (o navegador nunca decide o valor).
- Cartão só no componente do Mercado Pago (PCI); a loja não recebe número, validade nem CVV.
- Webhook com assinatura HMAC, tolerância de 15 min e idempotência (`payment_events`).
- Consulta de pedido sem CPF, telefone ou endereço completo; mesma resposta para "não existe" e "e-mail errado".
- CSV do painel com proteção contra fórmula embutida (`'=`).
- E-mails e logs sem dados completos do cliente (e-mail mascarado no log).
- `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`, `RESEND_API_KEY`, sais: só no servidor, nunca com `NEXT_PUBLIC_`.
