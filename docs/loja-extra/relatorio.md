# Relatório da loja extra (feat/loja-extra)

Branch criada a partir da `feat/vitrine` (que contém a `main`). Sem merge na `main`. 28/10/2026.

## Commits

| Item | Hash |
| --- | --- |
| 0 Checkout bloqueado em produção, URL por branch, vitrine no banco real | `c7fc487` |
| 1a Desconto no Pix | `a2fb527` |
| 1b–1d Checkout em uma página, salvar dados | `e768822` |
| 2 Kits | `f531986` |
| 3 Camisa personalizada | `5c99539` |
| 4 Lista de desejos | `264461d` |
| 5 Semana de corrida | `5fd92b7` |
| 6 Drops e pré-venda | `a010895` |
| 7 Lendas | `5bee20b` |
| 8 Documentação | `e9c6adc` |
| QA 1a Cards das Lendas | `23054e0` |
| QA 1b/1c e2e com o banco real, cache de vitrine | `a795767` |
| QA 2 Varredura, marcadores, e2e | `7cd10e3` |
| QA 3 Banco real | `fd8f15d` |
| QA 4 Desempenho | `efb8ca7` |

## O que passou

- tsc sem erros; lint 0 erros (os 2 avisos de sempre); build ok; unitários 341/341 (77 arquivos, com PGlite).
- e2e no build de produção (seed): 43 ok, 11 pulados (banco real, dev e entrega local). e2e no build de produção COM o
  Supabase real e dados de teste (`e2e/banco-real.spec.ts`): 4/4 (corridas, drops, personalização até a fila do
  fornecedor e o painel, lista de desejos com link curto), desktop e celular. Calendário e drops também no dev: 2/2 cada.
- `qa:varredura`: sem alertas (5 larguras × 31 rotas). `qa:marcadores`: só os de sempre (textos legais e fichas).
- Banco real: `atualizacao-4.sql` aplicada (sem seed); `supabase:ativar` 103 ok / 0 falhas, com as tabelas novas
  fechadas para a chave pública além do previsto; `scripts/supabase/teste-loja-extra.mjs` 23/23 (Pix, kits, cupom × kit,
  personalização, drops, lista de espera, lista de desejos, importação da temporada como admin). Tudo apagado: 66 produtos,
  estoque 1029 e só o pedido que já existia. Nenhuma chave nos logs.
- Lighthouse mobile (mediana de 5, intercalado com a base): home 81 → 80, produto 81 → 80, checkout 89 → 88.
  Detalhes em `docs/loja-extra/desempenho.md`.

## Encontrado e corrigido no QA

- Selo "% off no Pix" do card vazava a 360/390 px com preço "de" (scroll horizontal no catálogo).
- Fundo das Lendas embutia ~40 KB de SVG por card no HTML (home 127,5 KB gzip); virou arquivo estático (43,1 KB).
- Cache de dados do Next guardava SEM PRAZO as leituras do Supabase feitas na renderização estática: um build novo
  reaproveitou a resposta dos produtos de antes da migração (sem a personalização). Na Vercel esse cache sobrevive a
  deploys. Agora as leituras de vitrine valem 5 min (`createShowcaseClient`); estoque e checkout continuam sempre frescos.
- Nomes das Lendas no limite da largura e anos quebrando no meio a 360 px.

## O que falhou ou não cumpre a meta

- Quadros da HOME: 4 acima de 20 ms (CPU 1×) e 348 acima de 33 ms (CPU 4×). A base também não cumpre (7 e 288), pelo
  mesmo motivo (VELOCIDADE/GlyphPortal e animações sempre ligadas). O checkout cumpre (0 e 2).
- A nota do Lighthouse varia muito nesta máquina (uma série com carga deu 52–74 na própria base).

## O que não pôde ser testado

- Mercado Pago real (Pix gerado já com desconto): sem credenciais. E-mail do aviso de drop: sem Resend.
- A página `/admin/corridas/importar` clicada no navegador: a importação foi testada pela mesma camada com sessão de
  administrador e RLS (23 corridas de 2026), não pelo botão. Avaliações continuam desligadas.

## O que depende de você

1. Decidir o percentual do Pix (`NEXT_PUBLIC_PIX_DISCOUNT_PERCENT`), o adicional real da personalização e se cupom soma
   com kit. Cadastrar kits, corridas (importar a temporada) e drops no painel.
2. Produtos com a tag `lenda-{slug}` para as Lendas saírem do "Em breve"; revisar os textos e as fontes.
3. Páginas legais: ainda são esqueleto ("[CONTEÚDO A SER REDIGIDO]"); `docs/juridico/paginas-legais.md` não existe em
   nenhuma branch. Citar lista de espera, lista de desejos e GA4/Pixel na Política de Privacidade.
4. O resto do roteiro do CLAUDE.md (chaves de produção, domínio, Resend, fotos licenciadas, dados da empresa).

## Branches

| Branch | Contida em |
| --- | --- |
| `main` (`4dd82e2`) | todas |
| `feat/conteudo` | só nela mesma: tem 1 commit VAZIO a mais ("Dispara a prévia da Vercel"), sem arquivos |
| `feat/backend` | refino, lançamento, carros, vitrine, loja-extra |
| `feat/refino` | lançamento, carros, vitrine, loja-extra |
| `feat/lancamento` | carros, vitrine, loja-extra |
| `feat/carros` | vitrine, loja-extra |
| `feat/vitrine` | loja-extra |
| `feat/loja-extra` | — (contém todo o trabalho; 98 commits à frente da `main`) |

**Para um único merge na `main`:** fast-forward da `main` para a `feat/loja-extra` (a `main` é ancestral dela; nenhum
conflito). Production na Vercel hoje só tem variáveis de configuração (W, H, W_2, H_2, W_3, H_3): sem Supabase, sem
pagamento e sem `NEXT_PUBLIC_ALLOW_INDEXING`. Com o merge, Production passa a mostrar a loja nova em modo seed, fora
dos buscadores, com o checkout BLOQUEADO ("Estamos finalizando a abertura da loja"). Depois do merge, as branches antigas
podem ser apagadas (a `feat/conteudo` só perde o commit vazio).
