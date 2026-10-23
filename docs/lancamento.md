# Lançamento

Lista do que falta antes de abrir a loja ao público, na ordem sugerida. Marque cada item ao concluir. Depois, siga o
roteiro de teste de compra (seção 10) e só então ligue a indexação (seção 11).

Estado em 23/10/2026 (branch `feat/carros`): Supabase, Mercado Pago, Melhor Envio, Resend (e-mails), GA4/Meta Pixel
e WhatsApp estão **prontos e desligados**; o site roda com o catálogo de demonstração, pedidos simulados e frete
simulado. Banco que já recebeu o setup completo: rodar `supabase/atualizacao-2.sql` (cupons, consulta de pedido,
limites, histórico, cancelamento, painel, e-mails). **Nunca** rode o `setup-completo.sql` de novo depois de cadastrar
produtos reais: ele contém o seed de demonstração e repõe produtos de teste e estoque.

## 1. Contas e credenciais

- [ ] **Supabase**: criar o projeto (região São Paulo), colar `supabase/setup-completo.sql` no SQL Editor, cadastrar os
      e-mails de admin, configurar o login por link mágico. Passo a passo: `docs/backend/supabase.md`.
- [ ] **Mercado Pago**: conta de vendedor verificada, aplicação criada, credenciais de **teste** primeiro e depois as de
      **produção**; webhook apontando para `https://SEU-DOMINIO/api/webhooks/mercadopago`. Guia:
      `docs/backend/mercadopago.md`.
- [ ] **Melhor Envio** (opcional; sem ele o frete é simulado por tabela): conta, token (sandbox → produção) e CEP de
      origem. Guia: `docs/backend/frete.md`.
- [ ] **Resend** (e-mails do pedido) com o domínio verificado (SPF/DKIM). Guia: `docs/backend/email.md`.
- [ ] **Vercel**: plano compatível com uso comercial (o Hobby não permite) e as variáveis abaixo em **Production**.

### Chave secreta do Supabase (trocar a service_role legada)

O Supabase tem chaves novas: **publishable** (`sb_publishable_...`, substitui a anon) e **secret** (`sb_secret_...`,
substitui a service_role legada em JWT). A secret nova pode ser revogada e trocada sem derrubar as outras, e não vale
fora do servidor.

- [ ] Project Settings → API Keys → criar uma **secret key** (ex.: "vercel-producao").
- [ ] Na Vercel, colocar o valor em `SUPABASE_SERVICE_ROLE_KEY` (o nome da variável continua o mesmo; o código aceita
      os dois formatos). Opcional: a publishable em `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Novo deploy, conferir com `pnpm supabase:ativar` (localmente, com o `.env.local` apontando para o mesmo projeto) e
      um pedido de teste.
- [ ] Só então desativar as chaves legadas (API Keys → Legacy API keys → Disable). Se algo parar, reative e confira as
      variáveis. **Não testado contra o Supabase real nesta sessão.**

### Production separada de Preview

- [ ] Na Vercel, cada variável tem ambientes: deixe as chaves **de produção** (Mercado Pago de produção, secret do
      Supabase de produção, Resend) só em **Production**; em **Preview**, credenciais de teste (ou nenhuma: o site cai
      no modo simulado). Hoje as variáveis do Supabase estão limitadas à branch `feat/carros` em Preview: ao ir para a
      `main`, cadastre-as também em Production.
- [ ] Toda mudança de variável vale só a partir do **próximo deploy** (Deployments → ⋯ → Redeploy). O `/admin` lista
      as variáveis que faltam (só os nomes).

## 2. Variáveis de ambiente (Vercel → Settings → Environment Variables → Production)

| Variável | Para quê | Obrigatória para vender |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Domínio definitivo (`https://www.sua-loja.com.br`), canônicos, sitemap, webhook | Sim |
| `NEXT_PUBLIC_CONTACT_EMAIL` | E-mail de contato no rodapé, /sobre e /contato | Sim |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Catálogo do banco | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Pedidos gravados (secreta, só servidor) | Sim |
| `ADMIN_EMAILS` | Quem entra no /admin (os mesmos de `admin_emails`) | Sim |
| `NEXT_PUBLIC_MP_PUBLIC_KEY`, `MP_ACCESS_TOKEN` | Pagamento real | Sim |
| `MP_WEBHOOK_SECRET` | Confirmação de Pix/boleto pelo webhook | Sim |
| `SHIPPING_ORIGIN_CEP` | CEP de onde a loja posta (padrão 37950-000) | Conferir |
| `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_ENV=production`, `MELHOR_ENVIO_CONTACT_EMAIL`, `MELHOR_ENVIO_SERVICES` | Frete real | Opcional |
| `LOCAL_DELIVERY_ENABLED`, `LOCAL_DELIVERY_PRICE_CENTS` | Entrega local | Opcional |
| `RESEND_API_KEY`, `EMAIL_FROM` | E-mails do pedido (`docs/backend/email.md`) | Recomendado |
| `RATE_LIMIT_SALT` | Sal do hash do IP no limite de tentativas (texto aleatório longo) | Recomendado |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Botão e links de WhatsApp (só dígitos, com 55) | Opcional |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | Medição/marketing com banner de consentimento (citar na Política de Privacidade) | Opcional |
| `NEXT_PUBLIC_ALLOW_INDEXING=true` | Liberar buscadores (**só no dia**, seção 11) | No dia |

Lista completa com comentários: `.env.example`. Toda mudança de variável exige **novo deploy**.

## 3. Domínio próprio

- [ ] Registrar o domínio (registro.br para `.com.br`).
- [ ] Vercel → Settings → Domains → adicionar `www.sua-loja.com.br` e o domínio sem `www` (redirecionando para um deles);
      apontar o DNS como a Vercel indicar.
- [ ] Atualizar `NEXT_PUBLIC_SITE_URL` (Production) e o webhook do Mercado Pago.
- [ ] **Supabase → Authentication → URL Configuration:** *Site URL* = `https://SEU-DOMINIO`; *Redirect URLs* =
      `https://SEU-DOMINIO/admin/entrar/callback` (e, se usar o painel nas prévias, `https://*-SEU-TIME.vercel.app/admin/entrar/callback`).
      Sem isso, o link mágico do painel volta para o endereço antigo.
- [ ] E-mail no domínio (ex.: `contato@sua-loja.com.br`) para o `NEXT_PUBLIC_CONTACT_EMAIL`, e o domínio verificado no
      Resend para o `EMAIL_FROM` (ex.: `pedidos@sua-loja.com.br`). SMTP do Supabase com o mesmo domínio
      (`docs/backend/email.md`).

## 3b. Backups e exportação periódica

- [ ] Saber o que o plano do Supabase guarda: o gratuito **não** tem backup diário acessível pelo painel; o Pro tem
      backups diários (7 dias) e, pago à parte, recuperação a um ponto no tempo (PITR). Para uma loja vendendo, Pro.
- [ ] Cópia própria semanal (fora do Supabase): `supabase db dump --linked -f backup-AAAA-MM-DD.sql` (CLI, com o projeto
      ligado) e guardar em local seguro (contém dados de clientes: criptografado e com acesso restrito).
- [ ] Exportações do painel toda semana (e no fechamento do mês): **Pedidos → Exportar CSV** (período do mês) e
      **Comprar no fornecedor → Exportar CSV**; a newsletter em **Newsletter → Exportar**. Servem para o contador e como
      cópia legível.
- [ ] Fotos dos produtos (bucket `produtos`): baixar de tempos em tempos ou manter os originais em outro lugar.
- [ ] Testar uma restauração uma vez (num projeto Supabase de teste) antes de precisar.

## 4. Dados da empresa (Decreto 7.962/2013)

Arquivo `lib/company.ts` (todos os campos opcionais; só o preenchido aparece no rodapé, /sobre e /contato):

- [ ] Razão social (nome empresarial)
- [ ] CNPJ (ou CPF, se vender como pessoa física; conferir com o contador)
- [ ] Endereço físico completo
- [ ] E-mail de atendimento (`NEXT_PUBLIC_CONTACT_EMAIL`) e telefone/WhatsApp (opcional)
- [ ] Horário de atendimento (opcional)

O decreto exige nome empresarial, CNPJ/CPF, endereço e meio de contato **em local de destaque** antes de vender.

## 5. Textos provisórios que ainda aparecem no site

Levantado no build de produção por `pnpm qa:marcadores` (percorre as 100 páginas públicas e lista o texto visível entre
colchetes). Rode de novo depois de escrever os textos: a meta é **0 páginas com marcadores**.

| Página | Marcadores | Onde editar |
| --- | --- | --- |
| `/politica-de-privacidade` | `[CONTEÚDO A SER REDIGIDO]` ×11, `[DATA]` ×1 | Textos em `lib/institutional.ts`; "Última atualização: [DATA]" em `components/institutional-page.tsx:30` |
| `/termos-de-uso` | `[CONTEÚDO A SER REDIGIDO]` ×9, `[DATA]` ×1 | `lib/institutional.ts`; `[DATA]` idem |
| `/trocas-e-devolucoes` | `[CONTEÚDO A SER REDIGIDO]` ×6, `[DATA]` ×1 | `lib/institutional.ts`; `[DATA]` idem |
| `/faq` | `[CONTEÚDO A SER REDIGIDO]` ×7 (uma por pergunta) | `lib/institutional.ts` (`faq.questions`) e a resposta em `components/institutional-page.tsx` |
| `/envio` | `[CONTEÚDO A SER REDIGIDO]` ×5 | `lib/institutional.ts` |
| `/contato` | `[CONTEÚDO A SER REDIGIDO]` ×4 | `lib/institutional.ts` (os dados de contato já vêm de `lib/company.ts`) |
| `/sobre` | `[CONFIRMAR]` ×2 (prazos de envio/entrega; política de trocas) | `lib/content/sobre.ts` (`howWeWork`) |
| `/produtos/*` (as 66 páginas do catálogo de demonstração) | `[CONFERIR COM O PRODUTO REAL]` ×1 (ficha), `[CONTEÚDO A SER REDIGIDO]` ×2 (abas "Envio" e "Trocas e devoluções") | Ficha: desmarcar "Ficha ainda não conferida" no admin (ou `detailsPending` no seed); abas: `app/(loja)/produtos/[slug]/page.tsx:174` e `:183` |
| `/produtos/*` com tamanhos (no guia de tamanhos, aberto por botão; não aparece no HTML) | `[MEDIDAS A CONFIRMAR COM O FORNECEDOR]` e tabela de medidas de exemplo | `components/size-guide.tsx:67` |

Os textos jurídicos (Privacidade, Termos, Trocas) são escritos pelo responsável (com advogado), não pelo assistente.

Outros conteúdos provisórios **sem colchetes**:

- [ ] **Catálogo de demonstração**: os 66 produtos do seed são ilustrativos (a página mostra "Produto ilustrativo
      (catálogo de demonstração)"), com fotos reaproveitadas. Arquivar todos e cadastrar os reais (admin ou importador
      CSV: `docs/backend/admin.md`). No checkout simulado aparece "Ambiente de demonstração"; some com o Mercado Pago.
- [ ] **Redes sociais do rodapé**: os ícones de Instagram, TikTok e YouTube apontam para `#top`
      (`components/site-footer.tsx:50–52`). Trocar pelos perfis reais ou remover.
- [ ] **Newsletter** ("Fique no grid"): o formulário não envia para lugar nenhum (`components/newsletter-form.tsx`).
      Ligar a um serviço (ex.: Brevo, Mailchimp) ou retirar antes de abrir.
- [ ] **"ou 3x de … sem juros"** na página de produto é só texto (`app/(loja)/produtos/[slug]/page.tsx:127`): conferir
      com as condições reais do Mercado Pago (juros por conta de quem?).
- [ ] **Valores de exemplo**: frete grátis a partir de R$ 299,00 (`lib/cart/config.ts`), tabela do frete simulado
      (`lib/shipping/simulated.ts`, se não usar o Melhor Envio), entrega local (`lib/shipping/config.ts`: faixa de CEP,
      R$ 10, grátis acima de R$ 150, 1–2 dias), parâmetros da calculadora de preço (admin).
- [ ] **Nome da marca** "Apex" é provisório (`lib/brand.ts`).

## 6. Favicon e imagem de compartilhamento

- [ ] Hoje o favicon (`app/icon.tsx`), o ícone da tela inicial do iPhone (`app/apple-icon.tsx`) e a imagem de
      compartilhamento (`app/opengraph-image.tsx`) são **gerados** a partir do nome provisório (inicial + ponto laranja).
- [ ] Com o logo definitivo: colocar `app/icon.png` (ou `.svg`, 512×512), `app/apple-icon.png` (180×180) e
      `app/opengraph-image.png` (1200×630) e apagar os `.tsx` correspondentes. Os arquivos antigos do v0 em `public/`
      (`icon*.png`, `icon.svg`, `apple-icon.png`) não são usados e podem sair.

## 7. Produtos reais

- [ ] Fotos próprias ou licenciadas de cada produto (mínimo 1; ideal 3–4, fundo neutro, ≥ 1600px).
- [ ] Para cada produto: preço (calculadora), tamanhos e estoque, modelo de venda (estoque próprio / sob encomenda),
      prazo de envio realista, origem, **peso e medidas da embalagem** (o frete depende disso), custo e fornecedor
      (privados), ficha conferida e descrição.
- [ ] Guia de tamanhos real (`components/size-guide.tsx`).
- [ ] Testar uma compra no próprio fornecedor de cada produto sob encomenda (`docs/operacao/modelo-de-venda.md`).

## 8. Fotos e licenças

- [ ] **Fotos dos carros**: nenhuma ligada ao site. As recebidas estão em `assets/carros-brutos/recebidos-2026-10-22/`
      (têm logos e números de patrocinadores; algumas com números de outros pilotos). Recortar
      (`scripts/carros/recortar.py`) e licenciar, ou deixar o topo do piloto como está (frase + números).
- [ ] **Fotos editoriais** (`public/images/editorial`, também usadas no Diário), **dos pilotos**
      (`public/images/pilotos`) e das categorias/produtos (Unsplash): licenciar ou trocar. Editoriais de largura total
      precisam de originais com ≥ 2880px.
- [ ] Logos das equipes: conferir o uso permitido; a loja é independente (sem vínculo com F1, equipes ou pilotos).

## 9. Operação e jurídico

- [ ] Questões de `docs/operacao/modelo-de-venda.md` com advogado e contador (tributos de importação, arrependimento em
      peças personalizadas, responsabilidade pelo prazo).
- [ ] Textos de Envio e Trocas publicados (seção 5) e coerentes com os prazos do site.
- [ ] E-mails transacionais: implementados (pedido recebido, pagamento aprovado, enviado, cancelado), ligam com
      `RESEND_API_KEY` + `EMAIL_FROM` (`docs/backend/email.md`). Sem eles, nada é enviado.
- [ ] **Política de Privacidade precisa citar as ferramentas de medição e marketing** quando `NEXT_PUBLIC_GA_ID`
      (Google Analytics 4) ou `NEXT_PUBLIC_META_PIXEL_ID` (Meta Pixel) estiverem configurados: o que coletam, para quê,
      que só carregam depois do consentimento no banner e como mudar a escolha ("Preferências de cookies" no rodapé).
      Citar também o Resend (e-mails do pedido), o Mercado Pago, o Supabase e a Vercel como operadores.
- [ ] Pix/boleto vencidos: o cancelamento depende do aviso do Mercado Pago; acompanhar no painel nas primeiras semanas.

## 10. Roteiro de teste de compra (ponta a ponta)

Faça em **Preview** com credenciais de **teste** do Mercado Pago e repita um pedido real pequeno em produção antes de
divulgar. Para cada compra, confira: página do pedido, status no `/admin/pedidos`, estoque baixado no `/admin/produtos`
e e-mail/CPF/endereço corretos no detalhe do pedido.

Cartões de teste do Mercado Pago (Brasil): Mastercard `5480 8328 0103 3311` ou Visa `4235 6477 2802 5682`, CVV `123`,
validade futura qualquer, CPF `12345678909`. O **nome do titular** decide o resultado: `APRO` aprova, `OTHE` recusa, `FUND`
recusa por saldo (detalhes em `docs/backend/mercadopago.md`).

1. **Pix** (produto de estoque próprio, CEP fora da região, ex.: `01310-100`)
   - [ ] Checkout mostra Econômica e Expressa com "Chega em X a Y dias úteis".
   - [ ] Pagamento por Pix → página do pedido com QR Code e "copia e cola", status "aguardando pagamento".
   - [ ] Simular o pagamento no painel do Mercado Pago → o webhook muda o pedido para **pago** (a página atualiza
         sozinha) e aparece em "Pedidos pagos para enviar" no admin.
2. **Cartão aprovado** (titular `APRO`, 3x)
   - [ ] Pedido **pago** na hora; a página mostra bandeira, final do cartão e parcelas; a sacola esvazia.
3. **Cartão recusado** (titular `OTHE`)
   - [ ] Fica no checkout com o motivo; **nenhum pedido pago**; o estoque **volta** (conferir no admin); a sacola continua.
4. **Boleto**
   - [ ] O Brick pede o CPF; página do pedido com link e linha digitável; status "aguardando pagamento".
   - [ ] Sem pagar até o vencimento: conferir que o pedido é cancelado e o estoque devolvido (aviso do Mercado Pago).
5. **Sob encomenda** (ex.: miniatura de capacete) **+ peça de estoque próprio** no mesmo pedido
   - [ ] Página do produto: "Produto sob encomenda · Importado" e "Envio estimado em 15 a 30 dias úteis".
   - [ ] Sacola e checkout: prazo do item mais lento e o aviso de mais de um pacote.
   - [ ] Depois do pagamento: o item aparece em `/admin/fornecedor`; "Copiar endereço e dados" cola certo; "Marcar
         comprado" com rastreio do fornecedor; o cliente vê "Em preparação" (nunca o rastreio do fornecedor).
   - [ ] "Marcar como enviado" no pedido → cliente vê o rastreio; itens passam a "Enviado".
6. **Entrega local** (CEP `37950-000`, São Sebastião do Paraíso)
   - [ ] Aparece "Entrega local · São Sebastião do Paraíso, MG" com o preço e o prazo configurados (e grátis a partir do
         valor definido), além das outras opções.
   - [ ] Escolher, pagar e conferir no detalhe do pedido do admin que a forma de entrega é "Entrega local".
7. **Cupom** (criar em `/admin/cupons`: um de 10%, um de frete grátis e um com limite de 1 uso)
   - [ ] Sacola e checkout mostram o desconto; o total cobrado no Mercado Pago é o total com desconto.
   - [ ] Cupom vencido, inativo ou abaixo do mínimo: mensagem clara, pedido não sai com desconto.
   - [ ] Cupom de 1 uso: o segundo pedido recusa; cancelar o primeiro no admin devolve o uso.
8. **Acompanhamento e e-mails**
   - [ ] E-mails "Pedido recebido" (Pix/boleto), "Pagamento aprovado", "Pedido a caminho" e "Pedido cancelado" chegam
         uma vez cada (o detalhe do pedido no admin mostra o registro).
   - [ ] `/pedido/consultar` com número + e-mail certos mostra status e rastreio; com e-mail errado, a mesma mensagem de
         "não encontrado"; sem CPF nem endereço completo.
9. **Admin**
   - [ ] Cancelar um pedido pago (motivo obrigatório) → estoque e cupom voltam, histórico registra; "Marcar como
         reembolsado" depois do estorno no Mercado Pago.
   - [ ] Pedido enviado: o cancelamento pede a confirmação extra.
   - [ ] Marcar os pedidos de teste como **teste** (somem dos indicadores do início do painel).
   - [ ] Exportar CSV de pedidos (com período) e da fila do fornecedor: abre certo no Excel (acentos, colunas, vírgula).
10. **Geral**
   - [ ] Celular (iPhone e Android) e computador; sem erros no console.
   - [ ] `pnpm qa:marcadores` sem páginas com marcadores; `pnpm qa:varredura` sem alertas.
   - [ ] Política de Privacidade, Termos e Trocas acessíveis pelo rodapé e pelo aceite do checkout.

## 11. Indexação (Google e outros buscadores)

Até o lançamento o site fica **fora do índice** dos buscadores, mesmo publicado na Vercel. Controle por uma variável:
`NEXT_PUBLIC_ALLOW_INDEXING` (código em `lib/indexing.ts`).

| | Variável ausente ou diferente de `true` (hoje) | `NEXT_PUBLIC_ALLOW_INDEXING=true` |
| --- | --- | --- |
| `/robots.txt` | `Disallow: /` (tudo bloqueado), sem sitemap | Libera o site; bloqueia só `/carrinho`, `/checkout`, `/pedido/`, `/admin`; aponta o sitemap |
| Meta robots | `noindex, nofollow` em **todas** as páginas | `index, follow` (sacola, checkout, pedido e favoritos: `noindex, follow`; admin sempre `noindex, nofollow`) |
| Cabeçalho `X-Robots-Tag` | `noindex, nofollow` em todas as respostas (páginas, imagens, arquivos) | Ausente (exceto no `/admin`) |
| `/sitemap.xml` | Vazio | Todas as páginas públicas |

### No dia do lançamento

1. Vercel → projeto → **Settings → Environment Variables** → adicione `NEXT_PUBLIC_ALLOW_INDEXING` = `true` no ambiente
   **Production** (deixe **Preview** sem ela, para as prévias nunca serem indexadas).
2. Confira também `NEXT_PUBLIC_SITE_URL` = o domínio definitivo (ex.: `https://www.sua-loja.com.br`): é o endereço que
   vai no sitemap e nos links canônicos.
3. **Faça um novo deploy** (Deployments → ⋯ → Redeploy). A variável é lida no build; sem deploy novo nada muda.
4. Confira: `https://seu-dominio/robots.txt` deve mostrar `Allow: /` e a linha `Sitemap:`; o código-fonte de uma página
   de produto deve ter `<meta name="robots" content="index, follow"/>`.
5. Opcional: cadastre o domínio no Google Search Console e envie `https://seu-dominio/sitemap.xml`.
