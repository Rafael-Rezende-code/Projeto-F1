# Relatório do refino 3 (feat/vitrine)

Branch `feat/vitrine`, criada a partir da `feat/carros` (o merge na `main` ainda não tinha acontecido). Sem merge na `main`.
Tudo medido com o **seed** (sem Supabase): o `.env.local` desta máquina tem as chaves, então os builds de medição rodaram
com as variáveis do Supabase vazias (`.claude/dev-seed.cjs`). **Nada do banco desta rodada foi testado no Supabase real**:
só no PGlite.

## Commits

| Item | Hash |
| --- | --- |
| 1.2 Curadoria (banco, seed, painel, importador, atualização 3) | `97e0f56` |
| 1.4 Coleções | `3850c2c` |
| 1.5 Presentes | `2394427` |
| 1.6 Faixa de benefícios | `56f638e` |
| 1.1 e 1.3 Home reordenada e Mais vendidos | `92999ed` |
| 1.7 Navegação (cabeçalho, menu, rodapé, sitemap) | `089d423` |
| 2.2 Guia de tamanhos removido | `05b286f` |
| 2.1 Galeria | `0886df0` |
| 2.3 Complete o look e Vistos recentemente | `cabfc89` |
| 2.4 Estoque baixo e Avise-me | `340d79f` |
| 2.5 Avaliações (desligadas) | `64b0d6b` |
| 2.6 Compartilhar | `5308b0b` |
| 3.1, 3.2, 3.3, 3.5 Catálogo | `628fddc` |
| 3.4 Cabeçalho editorial da categoria | `aa4b1b6` |
| 4.1 Hover do artigo e mapa de hovers | `d8ea8fd` |
| 4.3 Contadores dos pilotos | `1db2998` |
| 4.4 e 4.5 Microinterações e entrada orquestrada | `1049045` |
| QA: e2e novos e ajustes | `ec704bd` |
| 4.2 View Transitions estabilizadas | `af20856` |
| 4.6 Medição e ajuste de LCP do catálogo | ver `git log` (último commit da rodada) |

## Home: antes × depois

Ordem e motivos em `docs/refino-3/home.md`; prints da página inteira em `docs/refino-3/home/antes/` e `.../depois/`.
Primeiro produto: y ≈ 2968 px → **2017 px** no desktop 1440×900 (dentro da segunda tela depois do hero) e 1836 px no
celular 390×844.

## Lighthouse mobile (build de produção local, mediana de 3, intercalando com a base `feat/carros` na mesma hora)

| Página | Base (feat/carros) | Vitrine |
| --- | --- | --- |
| Home | 82 (5 execuções: 82/81/82/82/82) | **82** (82/82/81/82/82) |
| Catálogo `/produtos` | 80 (79/80/80) | **80** (79/80/80) |
| Produto `/produtos/scuderia-racing-jacket` | 81 (81/81/83) | **83** (83/81/83) |

Acessibilidade 100 (home e produto) e 98 (catálogo), Boas práticas 96, SEO 66–69 (o site está fora do índice até o
lançamento: `noindex` de propósito). **Nenhuma queda.** **A meta de 90 na home não foi atingida**, e já não era atingida
antes nesta máquina: a LCP (~4,7 s) é o texto do hero, que é desenhado de novo quando a Inter do hero entra (tipografia do
hero não pode ser alterada). Em execuções com a máquina carregada as notas oscilam de 56 a 84 nas duas versões; por isso os
números acima são de uma janela estável, intercalando as duas.

JavaScript (gzip): home 269,8 KB (base 269,4), catálogo 208,8 KB (base 204,2), produto 211,7 KB (base 207,7): +0,4 a +4,6 KB,
bem abaixo do limite de 40 KB. O HTML do catálogo caiu de 42,8 para 22,8 KB (paginação).

Encontrado e corrigido durante a medição: a entrada da grade com opacidade 0 atrasava a LCP do catálogo em ~0,9 s; ficou
só com transform.

## Quadros (4.6): rolagem rápida, 30 px por quadro, Edge 1440×900, build de produção

| Página | CPU 1×: quadros > 20 ms | CPU 4×: quadros > 33 ms |
| --- | --- | --- |
| Catálogo (vitrine) | **0** | **0 a 2** (duas medições) |
| Catálogo (base) | 0 | 3 |
| Home (vitrine) | 5 a 9 | 174 a 195 de 381 |
| Home (base) | 8 | 160 de 343 |

Traces em `docs/refino-3/traces/*.json.gz` (abrir no DevTools → Performance). **O catálogo cumpre a meta; a home não**, e
também não cumpria antes. Na home com CPU 4×, os quadros longos se espalham por toda a página e se concentram na VELOCIDADE
(GlyphPortal, de terceiro, que não pode ser alterado: 70 dos quadros longos) e nas animações contínuas (faixa de equipes,
grade animada da newsletter, spotlight), que são ligadas por decisão de produto. Sem limitação de CPU, os longos aparecem
quando novas fotos entram na tela.

## QA final

- `tsc` sem erros; lint 0 erros (os 2 avisos conhecidos); build ok.
- Unitários: 271 testes em 57 arquivos (inclui curadoria, coleções, presentes, filtros e paginação, Complete o look,
  avaliações, avise-me, política e o teste do build sem o bloco de exemplo das avaliações).
- e2e: 33 passaram, 3 pulados (entrega local, que depende de variáveis), contra o build de produção; novos em
  `e2e/vitrine.spec.ts`. A suíte roda com 1 worker (em paralelo, o servidor local ficava lento e os cliques expiravam).
- `pnpm qa:varredura`: sem alertas (rotas novas incluídas). `pnpm qa:marcadores`: nenhum marcador novo (os de sempre:
  textos legais e fichas de produto).

## O que não pôde ser testado

Supabase real: as três migrations novas (`supabase/atualizacao-3.sql`), "Mais vendidos" com vendas reais, o Avise-me
gravando, o envio e a moderação de avaliações, os filtros e colunas novas do painel e do importador. Tudo isso foi testado
no PGlite e com o painel desligado.

## O que depende de você

1. Aplicar `supabase/atualizacao-3.sql` no banco (SQL Editor ou CLI) e rodar `pnpm supabase:ativar`.
2. Se quiser as tags novas do seed no banco ("acessorio", "colecionavel"), rodar o seed de novo (repõe o estoque de exemplo).
3. Configurar, se quiser, a faixa de benefícios e o limite de estoque baixo (variáveis em `.env.example`).
4. Ligar as avaliações (`NEXT_PUBLIC_REVIEWS_ENABLED=true`) quando quiser recebê-las, e fazer novo deploy.
5. Avisar quem pediu "Avise-me" quando o tamanho voltar (manual: lista e CSV em `/admin/avise-me`).
6. Fotos reais para as coleções (as capas são as imagens de demonstração do seed) e produtos para Pistas 3D e Canecas.
