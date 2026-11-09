# Sessão do Campeão (feat/antonelli): relatório

Branch `feat/antonelli`, a partir da `main` (`561091e`). Sem migrações de banco. Commits por item:

| Item | Commit | O quê |
| --- | --- | --- |
| 1 | `a8daa0f` | Fontes dos fatos (`docs/conteudo/antonelli.md`): duas fontes por fato, lista do que ficou de fora |
| 2 | `32b8e3d` | Imagens: originais em `public/images/campeao/` sem alteração, derivados AVIF/WebP (coroa com alfa), máscara do ouro (57 KB), composição achatada |
| 3 | `8a437b1` | `/campeao`: Coroação, bandeira + números, coleção; `/colecao/campeao-2026` → 308 |
| 4 | `bfd40f8` | Home: capa estática + faixa de aviso; link no menu e no rodapé |
| 5 | `c4b2ed5` | Antonelli em `lib/drivers.ts` (só no código), card dourado primeiro, modo campeão |
| 6 | `94bba3f` | Diário: "Vinte anos, uma coroa" (644 palavras) |
| 7 | `8943d07` | Compartilhamento (next/og) e metadata |
| 8a | `5a7056c` | Testes unitários, e2e, produto de teste no banco real, sitemap, varredura |
| 8b | `4e489a3` | Desempenho (loops pausados fora da tela; capa sem antecipar fontes) e traces |
| 8c | `0df1e79` | Prints, GIFs, comparação de tipografia, CLAUDE.md |

## Fatos (regra: duas fontes)

Entraram: título no GP da Cidade do México (1º/11/2026, 3º lugar, precisava do 9º, 4 corridas por disputar); 20 anos e
68 dias, o mais jovem campeão (antes: Vettel, 23 anos e 134 dias, 2010); primeiro italiano campeão desde Ascari (1953),
73 anos; 9 vitórias em 2026 até o título; primeira vitória na China; Monza (primeiro italiano desde Scarfiotti, 1966);
número 12. **Ficaram de fora** (uma fonte só ou não confirmados): total de pontos, vantagem de 123 pontos, poles,
recordes só da Sky (pole mais jovem, Grand Slam em Mônaco etc.).

## Fidelidade ao protótipo

Mesmos valores do `index.html` (linha do tempo, posições, máscaras, curvas, durações, selo com `textLength` 486).
Prints em `docs/antonelli/prints/` (`folha-desktop-1440.jpg`, `folha-celular-390.jpg`, `desktop-2560-p*.jpg`, GIFs
`coroacao-desktop-1440.gif` e `coroacao-celular-390.gif`, ida e volta). Comparados com `docs/referencia/coroacao/prints/`:
mesma sequência (digitação, "Kimi" subindo, descida da coroa, encaixe, "THE CHAMPION", selo). O brilho em p = 0,60
aparece só no metal (`desktop-1440-p06.jpg` × `-p066.jpg`).

Diferenças conscientes:
- **Celular:** o palco fica acima do dock (o protótipo não tinha dock; sem isso, os olhos ficavam atrás dele).
- **Tipografia** (`tipografia-original-x-site.png`): seguindo o pedido (Inter 500, 12,6cqw, entrelinha .84, -0,035em),
  o "Kimi" fica igual ao do protótipo (`p_90.png`), mas um pouco menor e mais pesado que o da `original.png`, que usa
  uma grotesca mais fina e larga. Mono: JetBrains Mono 500 (o protótipo usava DejaVu Sans Mono do sistema).
- Selo com a Inter 500 (o protótipo pedia 600; a Inter do site é um subconjunto 400–500).
- Derivados até 1672 px (1774 na coroa): os originais não têm 1920/2560 px; ampliar não daria nitidez.

## Desempenho (build de produção, modo seed, mesma máquina)

- **Lighthouse mobile da home, base (`main`) × branch, intercalado, 5 execuções cada:** base 80/81/81/81/84 (mediana
  **81**), branch 83/78/78/79/79 (mediana **79**): **−2 pontos**, no limite pedido. A primeira versão caía 5 (82 × 77):
  a capa usava a Inter do hero (que o hero só carrega depois do primeiro quadro) e a mono, que entravam na disputa com o
  LCP; `decode()` antecipava as imagens lazy. **Simplificado:** a capa usa os fallbacks até chegar perto da tela, não
  decodifica nada e pausa os loops fora da tela; o card dourado não usa a mono. Acessibilidade 100, Boas práticas 96
  (404 local de `/_vercel/insights`), SEO 66 (noindex: esperado sem `NEXT_PUBLIC_ALLOW_INDEXING`).
- **Traces de rolagem** (`docs/antonelli/traces/`, 30 px por quadro, 1440×900): home base CPU 1× 10 quadros > 33 ms de
  408, 4× 108 de 408 (26%); home branch 1× 6 de 455, 4× 121 de 455 (27%). Sem trace (só os quadros), 4×: base 63–84 de
  408, branch 94–102 de 455 (≈ 21%); o experimento sem a capa deu o mesmo, ou seja, a capa não é a causa. `/campeao`:
  1× 1 quadro > 33 ms de 151; 4× 0. Não existe `/campeao` na base (sem "antes").

## QA

- `tsc` ok; lint 0 erros (2 avisos antigos conhecidos); build ok; `pnpm test`: 349 testes, 78 arquivos (8 novos em `lib/campeao.test.ts`).
- e2e no build de produção (seed): **51 passaram, 13 pulados** (os que dependem do banco ou de dados de exemplo do dev). `e2e/campeao.spec.ts`: rolagem até o fim e de volta, capa e aviso
  (sem salto, lembrado), card dourado, 308.
- Coleção vazia ("Em breve"): e2e no seed. **Coleção com produto de teste: NÃO rodou.** O teste está pronto (`e2e/banco-real.spec.ts` + `scripts/qa/dados-de-teste.mjs`, que põe a tag `antonelli` na camiseta da Mercedes e tira no "apagar"), mas o endereço do projeto Supabase do `.env.local` não resolve no DNS em 09/11/2026 (projeto pausado ou removido?). Nada foi gravado no banco.
- `pnpm qa:varredura` em 2560, 1440, 1280, 820, 768, 390 e 360 px com as rotas novas: **sem alertas** (sem scroll
  horizontal). `qa:marcadores`: nenhum marcador nas páginas novas.
- Movimento reduzido: a cena fica estática (100svh, composição final, selo) — `prints/reduced-motion-1440.jpg`.

## O que não deu para testar

- Celulares reais (iOS Safari: `plus-lighter` e `mask` com `cqw`); só emulação no Edge.
- O brilho no Firefox (não instalado).
- A coleção com produto no Supabase real (acima): reativar o projeto e rodar `node scripts/qa/dados-de-teste.mjs criar`, `node .claude/qa-server.cjs build`/`start -p 3001`, `E2E_DB=1 E2E_BASE_URL=http://localhost:3001 npx playwright test e2e/banco-real.spec.ts` e `... apagar`.
- Produção na Vercel com a branch (a branch não tem prévia aberta aqui; a Preview deploya no push).

## Licenciamento (antes de vender)

A arte da bandeira tem a marca F1 e foto de evento; as camadas da coroação dependem do direito de imagem do piloto. Ver
`docs/conteudo/imagens.md`.

## Antes do merge

Production na Vercel (09/11/2026): só as variáveis de configuração W, H, W_2, H_2, W_3, H_3. Sem Supabase, sem pagamento
e sem `NEXT_PUBLIC_ALLOW_INDEXING`. `/checkout` em produção mostra "Em breve você poderá concluir a compra por aqui."
(bloqueado) e as respostas trazem `X-Robots-Tag: noindex, nofollow`.
