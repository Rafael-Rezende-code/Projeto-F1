# A5: foto `senna-sentado` e o AVIF que "não termina"

**Resultado: não reproduzido neste ambiente** (Linux, sharp 0.35.3, Next 16.3, build de produção e `next dev`, cache de
imagens frio). Todas as versões AVIF e WebP das fotos editoriais e dos pilotos saem em **menos de 1,6 s (AVIF) e 0,26 s
(WebP)**, abaixo da meta de 3 s. A imagem **não foi alterada**.

## O que foi verificado

1. **Metadados** (sharp): `senna-sentado.jpeg` é JPEG sRGB, 3 canais, 8 bits, **sem perfil ICC, sem CMYK, sem EXIF**,
   1170×1431, 4:2:0, progressivo. As outras quatro fotos editoriais são iguais (todas progressivas).
2. **Estrutura do arquivo** (marcadores JPEG): as 5 editoriais têm a mesma estrutura: SOF2 (progressivo), 3 componentes
   2×2/1×1/1×1, **8 scans**, só APP0 (JFIF). Nada específico da `senna-sentado`.
3. **Progressivo × baseline**: a mesma foto reencodada em baseline leva o mesmo tempo para virar AVIF (≈ 1,2 s em 1080 e
   1920 px). Decodificar e reduzir leva só 16–37 ms: o custo é todo do **codificador AVIF** (o Next usa `effort: 3`).
   Reencodar a fonte não resolveria nada e ainda perderia qualidade (JPEG sobre JPEG).
4. **Páginas reais** (Diário e artigo do Senna, 1440 e 390 px, DPR 2/3, cache frio): todas as imagens terminam; a mais
   lenta é a própria `senna-sentado` (1,0–1,4 s), por ser a mais detalhada (grade, textura), não por defeito.
5. **Varredura completa** (19 rotas × 5 larguras, cache frio, produção e dev): nenhuma rota sem `networkidle`, nenhuma
   requisição de imagem pendente por mais de 5 s.
6. **Pior caso**: 30 AVIF pedidos ao mesmo tempo com cache frio levam até ~8 s cada, porque o Next reduz a concorrência do
   sharp (metade dos núcleos em produção, um quarto em `next dev`) e o AVIF é caro em CPU: os pedidos esperam na fila.

## Causa provável do que foi visto (na outra máquina)

Fila do codificador AVIF com cache frio: numa máquina mais lenta, sobretudo em `next dev` (concorrência ¼ dos núcleos)
ou com várias abas/larguras ao mesmo tempo (como a varredura), as fotos mais detalhadas e largas (a `senna-sentado` é a
mais cara das editoriais) ficam vários segundos na fila e parecem "não terminar". Uma vez geradas, ficam no cache
(`.next/cache/images`) e saem na hora.

Na **Vercel** a otimização é feita pela infraestrutura dela (não por este sharp local), então isso não afeta o site
publicado.

## Se voltar a acontecer na máquina local

- Medir com `curl -H "Accept: image/avif" "http://localhost:3001/_next/image?url=%2Fimages%2Feditorial%2Fsenna-sentado.jpeg&w=1920&q=85" -o NUL -w "%{time_total} %{content_type}"`.
  Se vier `image/jpeg`, o Next desistiu e devolveu o original.
- Opções, em ordem: aquecer o cache abrindo as páginas uma vez; subir `experimental.imgOptConcurrency` no
  `next.config.mjs` (mais memória); por último, servir só WebP para essa imagem.

## Medições (build de produção, uma requisição por vez, cache frio)

| Foto | AVIF 1080 | WebP 1080 | AVIF 1920 | WebP 1920 |
|---|---|---|---|---|
| abraco-redbull-ferrari.jpeg | 1308 ms (90 KB) | 210 ms (196 KB) | 1279 ms (110 KB) | 205 ms (222 KB) |
| senna-champanhe.jpeg | 918 ms (82 KB) | 198 ms (176 KB) | 871 ms (99 KB) | 205 ms (209 KB) |
| senna-pneus.jpeg | 1109 ms (99 KB) | 202 ms (204 KB) | 1293 ms (118 KB) | 215 ms (228 KB) |
| senna-sentado.jpeg | 1229 ms (78 KB) | 198 ms (185 KB) | 1162 ms (95 KB) | 168 ms (219 KB) |
| verstappen-capacete.jpeg | 1030 ms (71 KB) | 173 ms (145 KB) | 1000 ms (84 KB) | 172 ms (163 KB) |
| abraco-redbull-ferrari-desktop.png | 616 ms (39 KB) | 138 ms (85 KB) | 1152 ms (72 KB) | 196 ms (161 KB) |
| verstappen-capacete-desktop.png | 528 ms (34 KB) | 129 ms (67 KB) | 1022 ms (59 KB) | 187 ms (120 KB) |
| norris-principal.jpg | 1109 ms (43 KB) | 213 ms (88 KB) | 1056 ms (49 KB) | 157 ms (97 KB) |
| norris-secundaria.jpg | 875 ms (52 KB) | 192 ms (95 KB) | 968 ms (59 KB) | 173 ms (104 KB) |
| verstappen-principal.jpg | 1131 ms (52 KB) | 172 ms (99 KB) | 1044 ms (61 KB) | 155 ms (113 KB) |
| verstappen-secundaria.jpg | 1189 ms (114 KB) | 254 ms (265 KB) | 1553 ms (134 KB) | 236 ms (309 KB) |
| hamilton-principal.jpg | 1129 ms (84 KB) | 222 ms (178 KB) | 1553 ms (97 KB) | 204 ms (205 KB) |
| hamilton-secundaria.jpg | 853 ms (72 KB) | 241 ms (146 KB) | 741 ms (85 KB) | 213 ms (173 KB) |
| bortoleto-principal.jpg | 492 ms (51 KB) | 186 ms (87 KB) | 698 ms (61 KB) | 190 ms (105 KB) |
| bortoleto-secundaria.jpg | 909 ms (35 KB) | 182 ms (62 KB) | 860 ms (39 KB) | 177 ms (68 KB) |
simultâneas: 30 AVIF em 8103 ms; mais lentas: verstappen-capacete-desktop.png w1920 8069ms 200 | abraco-redbull-ferrari-desktop.png w1920 7954ms 200 | verstappen-secundaria.jpg w1920 7708ms 200 | verstappen-secundaria.jpg w1080 7330ms 200 | verstappen-capacete-desktop.png w1080 7329ms 200
