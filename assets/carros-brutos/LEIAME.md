# Fotos brutas dos carros (fora do deploy)

Coloque aqui as fotos de imprensa dos carros (uma ou mais por equipe), com a equipe ou o piloto no nome do arquivo
(ex.: `mclaren-1.jpg`, `redbull-lateral.png`, `ferrari.jpg`, `audi.jpg`). Fundo claro e liso dá o recorte mais limpo.

Depois rode `scripts/carros/recortar.py` (instruções no topo do arquivo). Ele escolhe a melhor foto por piloto, remove o
fundo, exporta `public/images/pilotos/carros/{slug}.png` e grava prévias em `previas/` (sobre fundo claro, escuro e
na cor da equipe). Confira a prévia: se o recorte não ficou bom, apague o PNG e a página volta às miniaturas.

**PLACEHOLDERS:** fotos de imprensa têm logos de patrocinadores e números de carro. Antes do lançamento, substituir.
