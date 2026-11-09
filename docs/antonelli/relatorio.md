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

---

# Passo 2: redesign do Kimi (feat/antonelli-2, 09/11/2026)

## O que mudou

- **Fotos novas** (`public/images/pilotos/antonelli/`): olhadas uma a uma e renomeadas pelo conteúdo: `podio`,
  `comemoracao`, `olhar` e `retrato-garagem`. Fora de uso, em `_extras/` (nada apagado): `capacete-confete` (marca d'água
  "BY: TLDESIGN") e `bandeira-texto-f1` (igual à `campeao/bandeira vertical.jpeg`, com o logo e o texto da F1 por cima).
  Todas são verticais (1170 px); não veio nenhuma horizontal. Registro em `docs/conteudo/imagens.md`.
- **Bandeira sem texto**: a `bandeira.png` traz no topo o logo da F1 e "First Italian champion in 73 years. Bellissimo."
  (texto que não é nosso). Gerei `campeao/derivados/bandeira-sem-texto.jpg`, recortada logo abaixo do texto (y = 188 px),
  usada no card da home e no topo da ficha. A bandeira original continua no capítulo 2 de `/campeao`.
- **Sistema dourado** (`components/ui/gold.tsx` + bloco "Sistema dourado do campeão" no `globals.css`): `GoldText`,
  `GoldBeamBorder` (borda de 1px com feixe girando), `GoldRibbon` (fita) e `GoldSheen` (brilho que passa a cada 7 s);
  tokens `--ouro-sombra … --ouro-brilho`; serifa itálica Cormorant Garamond 500 (`.font-ouro-serif`, `lib/fonts.ts`).
  **Ele não existia no repositório** (nem em outra branch): foi criado com os nomes e tokens pedidos. `GoldDust` não foi
  criado (partículas seriam desenho; não era necessário em nenhuma das telas pedidas).
- **Home**: a capa estática da coroação saiu (componente e CSS removidos). No lugar, o **card dourado** na seção de
  pilotos: 2 colunas e a altura dos 2 × 2 cards ao lado (desktop), a linha inteira de 640 a 1023 px e a largura toda no
  celular (foto em cima, texto sobre o preto: o texto sobre o rosto ficava com pouco contraste). "O CAMPEÃO" na serifa,
  nome com GoldText, "Campeão mundial 2026 · o mais jovem da história", botão "Reviva a coroação" e link "Ver a ficha do
  campeão". Feixe e brilho só com transform, pausados fora da tela; a serifa só baixa perto da tela.
- **/pilotos**: o mesmo card, com a foto do pódio, título h2 e o botão para a ficha (a coroação vira o link).
- **Ficha do campeão** (`/pilotos/antonelli`, `components/campeao/ficha-campeao.tsx`): topo com a bandeira em tela cheia
  (LCP com `priority`), fita "Campeão Mundial 2026", nome dourado, "Mercedes · carro número 12 · O mais jovem campeão da
  história"; **4 números** (20 anos e 68 dias, 9 vitórias em 2026, 73 anos de espera, 4 corridas por disputar), cada um
  com 2+ fontes anotadas em `CAMPEAO_RECORDS.sources`; **linha do tempo** com fio dourado (Bologna 2006, China, Monza,
  México); **galeria em mosaico** (12 colunas × 2 linhas no desktop, 2 colunas no celular; hover só com
  transform/opacity); **Coleção do Kimi** (tag `antonelli`; sem produto, "Em breve." elegante com borda dourada, lista e
  coleção Mercedes); card **"Reviva a coroação"** para `/campeao`. O "modo campeão" antigo (selo + recordes + linha do
  tempo) foi substituído por ela; a assinatura e o carro não aparecem na página do Kimi.
- **Barra superior**: com `CAMPEAO_DESTAQUE_ATE` valendo, o cabeçalho de todas as páginas ganha fio dourado na base,
  borda levemente dourada e o ponto do logo em ouro. Quem decide é um script no `<head>` (`CAMPEAO_BARRA_SCRIPT`), pelo
  relógio do visitante (dia de São Paulo): depois da data volta ao normal **sem deploy novo**, mesmo em página estática, e
  esconde a faixa de aviso caso a home em cache ainda a traga. A faixa de aviso ganhou um fio dourado.
- **/campeao, tipografia do "Kimi"**: Inter **400**, **14cqw**, line-height .84, tracking **−.02em** e sem a margem de
  cima. Altura das letras, linha de base e centro agora coincidem com a `original.png` (sobreposição em
  `prints/tipografia-original-x-site-2.png`). Veja a dúvida 1 sobre o desenho das letras.

## Dúvidas

1. **A `original.png` não foi feita com a Inter.** O "i" dela tem pingo quadrado e as letras são mais largas: é a fonte de
   reserva do protótipo (`"Helvetica Neue"`), o que aparece num Mac sem a Inter carregada. Testei a Inter com o tamanho
   óptico Display e os conjuntos ss07, ss08 e cv13: nenhum tem pingo quadrado. Por isso igualei altura, peso, base e
   centro, mas não dá para ficar idêntico com a Inter. Se o desenho da `original.png` for o desejado, a saída é usar uma
   Helvetica licenciada (ou uma parecida, de licença livre) só nesse título.
2. **Tamanho e tracking**: os valores pedidos (13,4cqw, −.035em) deixavam o "Kimi" mais baixo e mais estreito que o
   original; fiquei com 14cqw e −.02em, que batem na sobreposição.
3. **Bandeira com texto da F1**: usei a versão recortada no card e na ficha. O capítulo 2 de `/campeao` e a capa do artigo
   do Diário continuam com a arte inteira (com o logo/texto da F1). Sugestão: trocar também (não apliquei: fora do pedido).

## Medições (build de produção, modo seed, mesma máquina)

- **Lighthouse mobile da home**, intercalado 5 × 5 contra a `main` (f2c9cf7): base 78/78/79/79/79 (mediana **79**) →
  nova 81/80/80/80/81 (mediana **80**). LCP 4,94 → 4,72 s. A capa estática saiu e o card fica abaixo da dobra, com a
  serifa e as animações só perto da tela. Acessibilidade 100, Boas práticas 96 (404 local do `/_vercel/insights`), SEO 66
  (o `noindex` de propósito, até o lançamento).
- **Página do Kimi**, 3 execuções: base mediana 80 → **83** (LCP 5,09 → 4,34 s; TBT 145 → 39 ms).

## QA

- tsc ok; lint 0 erros (2 avisos conhecidos); build ok; `pnpm test` **351** testes passaram (novos: ficha com até 4
  números de 2+ fontes, galeria e a barra dourada antes/depois da data).
- e2e no build de produção: **51 passaram, 13 pulados** (os de banco real e de dados de exemplo do dev). `e2e/campeao.spec.ts`
  refeito: card dourado na home (sem capa), barra dourada, aviso, `/pilotos` → ficha (fita, ≤ 4 números, 4 marcos,
  galeria, "Em breve", coroação) e sem scroll horizontal.
- `pnpm qa:varredura` (1440, 1280, 820, 390, 360; inclui `/`, `/pilotos`, `/pilotos/antonelli`, `/campeao`): sem alertas.
- `pnpm qa:marcadores`: nenhum marcador provisório nas páginas do Kimi.
- Prints (`docs/antonelli/prints/a2-*`, por `scripts/qa/antonelli2-prints.mjs`): home (topo e card), `/pilotos`, ficha
  (topo e inteira, sem o rodapé) e `/campeao` em p = 0, .46 e .9, em 1440 e 390.
- Produção (https://apex-seven-ruddy.vercel.app) conferida antes do merge: `X-Robots-Tag: noindex, nofollow`, robots
  `Disallow: /` e checkout bloqueado ("Em breve você poderá concluir a compra por aqui").

## Para depois

- Licenciar as fotos novas do Kimi (origem desconhecida) e a arte da bandeira (marca F1).
- Trocar a arte com texto da F1 no capítulo 2 de `/campeao` e na capa do artigo do Diário (dúvida 3).
- Decidir a fonte do "Kimi" em `/campeao` (dúvida 1).
- Não testado: iPhone real (Safari), Firefox e a coleção com produto real (o projeto Supabase continua inacessível daqui;
  o teste está pronto em `e2e/banco-real.spec.ts`, agora apontando para `#colecao-do-kimi`).
