# Relatório final: rodada de conteúdo e backend (22/10/2026)

Branches: **`main`** = tudo o que foi aprovado até a `feat/pilotos` + correção das logos (fase 0).
**`feat/conteudo`** (fases 1 a 8 + QA) e **`feat/backend`** (fases 9 a 11, contém a `feat/conteudo`). Nenhuma das
duas tem merge na `main`. Decisões tomadas sem consulta: seção "Rodada de conteúdo e backend → Decisões tomadas sem
consulta" do `CLAUDE.md` (resumo abaixo). Prints e GIFs de cada fase em `docs/fase-N/`.

## O que foi feito, por fase

| Fase | Commit | Resumo |
| --- | --- | --- |
| 0 | `4dd82e2` (main), `4efc727` | Logos de várias linhas não encostam mais na pílula "VER COLEÇÃO" (768/820/1024 conferidos). Merge fast-forward da `feat/pilotos` na `main` (build ok). Branches antigas apagadas **só localmente** (ver pendências). `feat/conteudo` e `feat/backend` criadas. |
| 1 | `ccf6a3a` | Placeholder desfocado gerado no build para as 19 fotos locais. Fotos de piloto com cortina na cor da equipe + escala 1,06→1 + desfoque→nítido (~1 s), só depois do `decode()`; assinatura entra depois da foto. Secundária ao rolar. Fade sutil nas outras imagens grandes. Versões de desktop opcionais `{slug}-principal-desktop` / `-secundaria-desktop`. |
| 2 | `3137990` | Espaço do carro no topo do piloto (entrada lateral, sombra em CSS, inclinação ≤ 6° no desktop, espelhamento por `carFacing`). **Nenhuma foto de carro existe no repositório**, então os 4 pilotos mostram 3 miniaturas de produto. Script de recorte pronto (`scripts/carros/recortar.py`, testado numa foto do projeto). |
| 3 | `ccebcf5` | VELOCIDADE: padrão de linhas de fluxo (SVG gerado em código, deriva de 32 s) e 3 produtos `featured` revelados em duas colunas (carrossel no celular). Cabe em 1440×900, 1280×720 e 390×844. |
| 4 | `8578417` | Textos dos 4 pilotos (abertura, trajetória, estilo, números, curiosidades) com fontes por fato em `docs/conteudo/fontes-pilotos.md`. |
| 5 | `51c6408` | Textos das 11 equipes em `/equipes/[slug]` com fontes em `docs/conteudo/fontes-equipes.md`. |
| 6 | `914d969` | Diário: `/diario` e 3 artigos (637–683 palavras de corpo cada), fontes em `docs/conteudo/fontes-diario.md`; links de cabeçalho, menu e rodapé; "Ler o Diário →" em "Luzes apagadas.". |
| 7 | `42db0d5` | 66 descrições em 2 parágrafos + ficha marcada "[CONFERIR COM O PRODUTO REAL]". Sem "oficial". |
| 8 | `6426bdc` | `/sobre` com manifesto, o que vendemos e como trabalhamos; dados reais marcados [CONFIRMAR]. |
| 9 | `1460913` | Supabase pronto e desligado: migração com RLS, `create_order` transacional, seed, repositório, pedidos gravados, página do pedido pelo banco. Testes da migração/RLS em Postgres em memória. |
| 10 | `a043db5` | Mercado Pago pronto e desligado: Payment Brick (Pix, crédito em até 12x, boleto), webhook com assinatura e idempotência, páginas de status, cartão decorativo com bandeira e final. |
| 11 | `7916ecf` | Painel `/admin` pronto e desligado: link mágico, produtos (CRUD, variantes, estoque, fotos no Storage, status), pedidos (filtro, detalhe, rastreio). |
| QA | `5e687be`, `9733699` + este relatório | e2e do conteúdo novo, varredura com as páginas novas, contraste do rótulo dos destaques. |

## QA final

- `tsc --noEmit`: sem erros. `pnpm lint`: 0 erros (2 avisos conhecidos e intencionais).
- `pnpm build`: ok (com e sem as rotas novas; sem variáveis de ambiente o site é o mesmo de antes).
- Unitários (`pnpm test`): **57 testes em 10 arquivos**, todos passando, incluindo migração + RLS no PGlite e webhook.
- e2e (`pnpm test:e2e`, build de produção, desktop e celular): **15 passaram, 1 pulado** (o do dock só roda no celular).
  Inclui compra simulada, busca, dock e o novo `e2e/conteudo.spec.ts` (Diário, texto do piloto, da equipe e /sobre).
- `pnpm qa:varredura` (1440, 1280, 820, 390, 360 × 15 rotas): **sem alertas** (sem scroll horizontal, nada vazando,
  nenhum título cortado, sem erro de console além do 404 local do analytics). Saída em `docs/qa-final/varredura.txt`.
- Lighthouse mobile (mediana de 3, em `docs/qa-final/lighthouse-mobile.md`): **home 98**, **piloto 87** (era 86 na
  `main` de antes), **artigo 89**. Acessibilidade 100 / 97 / 100; SEO 100; CLS ≤ 0,006.
- Rodado nesta sessão com Chromium (sem Edge): `PW_EXECUTABLE_PATH=/opt/pw-browsers/chromium`. Na sua máquina, sem a
  variável, tudo continua no Edge.

## Decisões tomadas sem consulta (resumo)

- Cards de equipe: logo centrada numa área acima da pílula (logos de 1 linha sobem ~8px no desktop).
- `agentRules: false` no `next.config.mjs`: o `next dev` 16.3 escrevia um bloco em inglês no `CLAUDE.md`.
- Desfoque (filter) na entrada da foto de piloto, como pedido (exceção à regra de só animar transform/opacity).
- Carro e miniaturas entram 1,9 s / 2,1 s depois da foto (o nome já quase todo escrito), para não esperar 3 s.
- BlurReveal e WordsStagger só abaixo da dobra e com `inView` (eles escondem o texto até o JS carregar).
- Fatos com divergência entre fontes ficaram de fora ou genéricos (ex.: idade de Hamilton ao entrar na McLaren).
- O dock não ganhou item "Diário" (os 5 ícones aprovados ficaram); o link está no menu que o dock abre.
- Descrições: modelos por tipo de peça para as 60 peças de equipe/piloto; boné de piloto sem "assinatura bordada".
- Supabase: catálogo carregado inteiro com cache de 60 s; código APX-xxx vira `products.code`; preço de cada item do
  pedido vem do banco dentro da `create_order`.
- Mercado Pago por HTTP direto (sem o SDK Node); só cartão de crédito no Brick; cartão recusado fica no checkout.
- Admin com link mágico (sem senha), duas travas de acesso (`ADMIN_EMAILS` e tabela `admin_emails`).

## Pendências

- **Apagar as branches antigas no GitHub** (a política do ambiente em nuvem bloqueou o push de exclusão, HTTP 403). Todas
  estão contidas na `main`. Rode: `git push origin --delete perf/server-components feat/loja feat/polimento feat/polimento-2 feat/ajustes feat/pilotos`
- **Fotos dos carros:** não há nenhuma no repositório (nem no histórico). Coloque as fotos de imprensa em
  `assets/carros-brutos/` e rode `scripts/carros/recortar.py` (instruções no topo do arquivo); confira as prévias.
  Placeholders: antes do lançamento, trocar por carros sem logos nem números ou licenciar.
- **Contraste no cabeçalho do piloto** (já existia antes): caminho, link da equipe e frase em branco translúcido sobre
  algumas cores de equipe (Ferrari 2,9–4,0:1). Sugestão: branco sólido nesses três textos. Não aplicado (fora do pedido).
- Licenciamento das fotos editoriais, de piloto e de produto (já registrado); fichas de produto a conferir; dados
  [CONFIRMAR] da /sobre; textos legais; razão social/CNPJ/endereço em `lib/company.ts`.
- E-mails transacionais (confirmação, envio) não implementados: precisam de um serviço de e-mail.
- Pix/boleto vencidos só liberam o estoque quando o Mercado Pago avisa o cancelamento; se quiser antes, uma rotina
  (cron) que cancele pedidos antigos sem pagamento.
- **Não testado contra serviços reais** (sem credenciais nesta sessão): Supabase (fora o SQL, testado no PGlite),
  Mercado Pago e o painel logado. Faça o roteiro de teste dos guias em Preview antes de produção.

## O que você precisa criar ou enviar para ativar

### Supabase (catálogo, pedidos, painel) — guia: `docs/backend/supabase.md` e `docs/backend/admin.md`
1. Criar o projeto no Supabase (região São Paulo) e guardar a senha do banco.
2. No SQL Editor: rodar `supabase/migrations/20261022000000_loja.sql`, depois `supabase/seed.sql`.
3. No SQL Editor: `insert into admin_emails (email) values ('<seu e-mail em minúsculas>');`
4. Authentication: deixar o provedor Email ligado, **desligar o cadastro aberto**, criar o(s) usuário(s) admin com o
   mesmo e-mail, e em URL Configuration pôr a *Site URL* e o *Redirect URL* `https://<domínio>/admin/entrar/callback`.
5. Na Vercel (Production e Preview) e no `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project Settings → API → Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role, secreta)
   - `ADMIN_EMAILS` (os mesmos e-mails do passo 3)
   - `NEXT_PUBLIC_SITE_URL` (URL pública https do site)
6. Novo deploy.

### Mercado Pago (pagamentos) — guia: `docs/backend/mercadopago.md`
1. Criar a aplicação em *Suas integrações* (Checkout Transparente / Bricks).
2. Copiar as **credenciais de teste** (Public Key e Access Token) para:
   - `NEXT_PUBLIC_MP_PUBLIC_KEY`
   - `MP_ACCESS_TOKEN` (secreta)
3. Em *Webhooks → Configurar notificações*: URL `https://<domínio>/api/webhooks/mercadopago`, evento **Pagamentos**;
   copiar a **assinatura secreta** para `MP_WEBHOOK_SECRET`.
4. Novo deploy (Preview), testar com os cartões de teste do guia (APRO, OTHE, CONT...), Pix e boleto.
5. Para produção: ativar as credenciais de produção, trocar as três variáveis pelas de produção, configurar o webhook
   de produção, deploy e uma compra real de valor baixo (estornar depois).

Modelo de todas as variáveis: `.env.example`.
