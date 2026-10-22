# Fotos brutas dos carros (fora do deploy)

Coloque aqui as fotos de imprensa dos carros (uma ou mais por equipe), com a equipe ou o piloto no nome do arquivo
(ex.: `mclaren-1.jpg`, `redbull-lateral.png`, `ferrari.jpg`, `audi.jpg`). Fundo claro e liso dá o recorte mais limpo.

Depois rode `scripts/carros/recortar.py` (instruções no topo do arquivo). Ele escolhe a melhor foto por piloto, remove o
fundo, exporta `public/images/pilotos/carros/{slug}.png` e grava prévias em `previas/` (sobre fundo claro, escuro e
na cor da equipe). Confira a prévia: se o recorte não ficou bom, apague o PNG e a página volta às miniaturas.

**PLACEHOLDERS:** fotos de imprensa têm logos de patrocinadores e números de carro. Antes do lançamento, substituir.

## Recebidas em 22/10/2026 (refino 2) — NÃO ligadas no site

`recebidos-2026-10-22/`: Audi #27, Red Bull #7, McLaren, Red Bull #1 e Ferrari #44. Nesta rodada a instrução era não
usar PNG de carro, então ficaram só guardadas. Observações para quando forem usadas:

- Audi #27 e Red Bull #7 **não** são os números dos pilotos do site (Bortoleto corre com o 5; Verstappen com o 3 em
  2026). Red Bull #1 e Ferrari #44 batem com Verstappen (número antigo) e Hamilton; a McLaren serve para Norris.
- São fotos com logos de patrocinadores e números: **placeholders** (licenciar ou trocar por carros sem logos antes de
  vender). Para recortar: `scripts/carros/recortar.py` (renomeie para `{slug}.*` do piloto).
