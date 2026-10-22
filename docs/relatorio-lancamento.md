# Relatório: preparação para o lançamento (22/10/2026)

Branch `feat/lancamento`, a partir da `feat/refino`. Sem merge na `main`.

| Item | Commit | O que mudou |
| --- | --- | --- |
| 1 | `e6cffcb` | `supabase/setup-completo.sql`: as migrations + o seed num arquivo só, reexecutável (`pnpm supabase:setup`); passo a passo em `docs/backend/supabase.md` |
| 2 | `f3f245d` | Site fora do índice até `NEXT_PUBLIC_ALLOW_INDEXING=true`: robots `Disallow: /`, meta `noindex, nofollow`, `X-Robots-Tag` e sitemap vazio |
| 3 | `248d4a4`, `280d0de` | Importador CSV no admin: modelo, prévia, lote numa transação (`import_products`), fotos baixadas e otimizadas no Storage, privados em `product_private` |
| 4 | `559b224` | `docs/lancamento.md` (checklist completo + roteiro de teste de compra) e `pnpm qa:marcadores` |
| QA | este commit | Testes e2e sem corrida de streaming; relatório |

## QA (build de produção)

- `tsc` ok; lint 0 erros (2 avisos conhecidos); **102 testes unitários** (19 arquivos: parser do CSV, fotos, setup
  rodado duas vezes no PGlite, importação atômica e RLS).
- E2E: **42 passaram** com cada teste repetido duas vezes (2 pulados, o mesmo de antes), desktop + celular.
- `pnpm qa:varredura`: sem alertas (19 rotas × 5 larguras).
- Indexação conferida nos dois modos (sem a variável: tudo bloqueado; com `true`: liberado, privadas com `noindex`).
- `pnpm qa:marcadores`: 73 de 100 páginas ainda têm texto provisório (66 são produtos de demonstração). Lista em
  `docs/lancamento.md`, seção 5.

## Decisões tomadas sem consulta

- O `setup-completo.sql` é **gerado** a partir das migrations (não editado à mão), e um teste falha se faltar alguma.
- Importador: linhas com erro ficam de fora e as válidas são importadas (o lote válido é atômico); produto novo sem foto
  ou com foto que falhou entra como rascunho; célula vazia de custo/fornecedor/notas/imagens não apaga o que existe.
  `sharp` foi para `dependencies` (otimização das fotos no servidor). Endereços internos de rede são recusados.
- E2E: dois testes passaram a procurar o texto só dentro de `#conteudo` (durante o streaming o React mantém por um
  instante uma cópia oculta, o que fazia o teste falhar às vezes; não é conteúdo duplicado na tela).

## Pendências

Tudo em `docs/lancamento.md`. As principais: contas e credenciais (Supabase, Mercado Pago, Melhor Envio, domínio,
e-mail), dados da empresa, textos jurídicos e das páginas de ajuda, produtos e fotos reais, redes sociais do rodapé e
newsletter (hoje sem destino), favicon e imagem de compartilhamento definitivos. Nada foi testado contra os serviços
reais (sem credenciais nesta sessão). O importador foi testado com banco e Storage simulados.
