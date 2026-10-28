# Desempenho da loja extra (28/10/2026)

Build de produção local em modo seed (sem Supabase), Edge headless, mesma máquina e mesma hora, alternando cada execução
entre a base (`feat/vitrine`, `3d07485`, worktree em `../apex-base-vitrine`) e a `feat/loja-extra`.

## Lighthouse mobile (mediana de 5, intercalado)

| Página | Base | Loja extra | Diferença | Notas (base / extra) |
| --- | --- | --- | --- | --- |
| Home `/` | 81 | 80 | −1 | 74/81/81/81/81 · 81/79/81/79/80 |
| Produto `/produtos/scuderia-racing-jacket` | 81 | 80 | −1 | 83/80/82/78/81 · 80/79/82/80/82 |
| Checkout `/checkout` | 89 | 88 | −1 | 89/92/88/89/89 · 89/89/87/84/88 |

Nenhuma página cai mais de 3 pontos. Acessibilidade 100 e Boas práticas 96 nas três (SEO 63–69 porque o site está fora do
índice até o lançamento, de propósito).

**Encontrado e corrigido na medição:** o fundo gráfico das Lendas desenhava o SVG das linhas (26 caminhos, ~40 KB) DENTRO
de cada card; com 3 na home e a repetição nos dados de hidratação, o HTML da home foi de 40,9 KB para 127,5 KB (gzip) e
a nota caiu (44–56 numa primeira série). Agora o desenho é um arquivo estático (`public/images/lendas/linhas.svg`, gerado
por `scripts/images/linhas-lendas.mts`): HTML da home 43,1 KB, visual igual.

JavaScript (gzip): home 269,8 → 275,3 KB, produto 211,7 → 219,4 KB, checkout 306,8 → 312,8 KB.

A máquina varia muito: numa série com carga no sistema, a própria base deu 52–74 (TBT até 2,4 s). Os números acima são de
uma série estável.

## Quadros (rolagem de 30 px por quadro, 1440×900; `scripts/qa/trace.mjs`)

| Página | CPU 1×: quadros > 20 ms | CPU 4×: quadros > 33 ms |
| --- | --- | --- |
| Checkout com 3 peças (`--sacola`), loja extra | **0** de 55 | **2** de 55 (máx. 33,2 ms) |
| Checkout com 3 peças, base | 0 de 26 | 0 de 26 |
| Home, loja extra | 4 de 409 | 348 de 409 |
| Home, base | 7 de 381 | 288 de 381 |

**O checkout cumpre a meta; a home não**, e a base também não cumpria (mesmo padrão: quadros longos espalhados pela página,
concentrados na VELOCIDADE/GlyphPortal, que não pode ser alterado, e nas animações contínuas sempre ligadas por decisão de
produto). A home da loja extra é mais comprida (409 × 381 quadros de rolagem: blocos novos de Lendas, drops e corrida)
e teve menos quadros longos sem limitação (4 × 7). Com CPU 4× esta máquina não sustenta 30 fps na home em nenhuma das versões.
Traces em `docs/loja-extra/traces/*.json.gz` (DevTools → Performance → carregar).
