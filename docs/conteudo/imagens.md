# Imagens da Sessão do Campeão

**Origem:** fornecidas pelo Rafael (dono do projeto) em 09/11/2026. Originais em `public/images/campeao/`, sem alteração
(conferido por SHA-1 depois de mover a pasta de `campeão/` para `campeao/`: acento em URL dá problema de codificação).

| Arquivo original | Uso |
| --- | --- |
| `fundo_rosto.png` (1672×941) | camada de fundo da Coroação (rosto) |
| `camada_coroa.png` (1774×887, com alfa) | coroa + mãos, desce sobre o rosto |
| `Kimi e a coroa dourada.png` (1672×941) | imagem aprovada com a tipografia a imitar (igual a `docs/referencia/coroacao/original.png`); não é usada no site |
| `bandeira.png` (1672×941) | capítulo 2 (desktop/tablet) |
| `bandeira vertical.jpeg` (1170×1463) | capítulo 2 no celular; foto do card e do topo de `/pilotos/antonelli` |

Derivados em `public/images/campeao/derivados/`, gerados por `pnpm images:campeao` (`scripts/images/campeao.mjs`):
AVIF e WebP em 768, 1280 e a largura do original (a coroa mantém o alfa nos dois formatos), `mascara-ouro.webp`
(máscara do brilho, 57 KB, porta de `mask_ouro.py` com a região 0.295 0.707 0.12 0.68: diferença média de 0,75/255
para a `mask_camada.png` de referência; prévia em `docs/antonelli/mascara-previa.png`) e `composicao-final.jpg` (rosto +
coroa achatados, base da imagem de compartilhamento). Placeholders desfocados: `pnpm images:blur` (como as outras fotos).
Não há 1920/2560: os originais têm 1672 px; ampliar só aumentaria o arquivo.

**Licenciamento:** `bandeira.png` e `bandeira vertical.jpeg` são uma arte com a marca **F1** e o texto "First Italian
champion in 73 years. Bellissimo." embutidos, sobre foto de evento (macacão com patrocinadores). Como as fotos
editoriais e os carros, são **placeholders**: licenciar ou trocar antes da venda. As camadas da coroação (rosto, coroa,
mãos) também precisam de confirmação de direitos de imagem do piloto antes do lançamento comercial.

## Fotos do Kimi (feat/antonelli-2)

**Origem:** fornecidas pelo Rafael em 09/11/2026 (arquivos "WhatsApp Image 2026-11-09 at …"), renomeadas pelo conteúdo.
Origem/licença conhecida: **nenhuma** (fotos de evento e de imprensa, com patrocinadores no macacão). São
**placeholders**: licenciar ou trocar antes da venda, como as editoriais. Todas verticais, 1170 px de largura; o
`next/image` gera AVIF/WebP nos tamanhos pedidos (`sizes` em cada uso); `priority` só no LCP (o topo da página do Kimi).

| Arquivo (`public/images/pilotos/antonelli/`) | O que mostra | Onde é usado |
| --- | --- | --- |
| `podio.jpeg` (1170×1560) | No pódio do México, boné Pirelli com louros, sorrindo, com a bandeira da Itália na mão | card dourado em `/pilotos`; galeria da página do Kimi; foto do piloto no catálogo/busca (`lib/drivers.ts`) |
| `comemoracao.jpeg` (1170×1542) | De capacete, em pé no carro, apontando para o alto, com a placa "1" da F1 ao lado | galeria (bloco grande) |
| `olhar.jpeg` (1170×1431) | Close no capacete verde-amarelo, só os olhos aparecem pela viseira | galeria (bloco largo) |
| `retrato-garagem.jpeg` (1170×1587) | Sentado num pneu, cercado de pneus Pirelli, sorrindo | galeria (bloco largo) |
| `_extras/capacete-confete.jpeg` | Capacete com confete dourado | **fora de uso**: marca d'água "BY: TLDESIGN" |
| `_extras/bandeira-texto-f1.jpeg` | Igual a `campeao/bandeira vertical.jpeg` | **fora de uso**: duplicada e com logo/texto da F1 sobrepostos |

**Derivado novo:** `public/images/campeao/derivados/bandeira-sem-texto.jpg` (1672×753): `bandeira.png` recortada logo
abaixo do logo da F1 e do texto em inglês (texto de terceiros). Usada no fundo do card dourado da home e no topo de
`/pilotos/antonelli`. Gerada por `pnpm images:campeao` (fim de `scripts/images/campeao.mjs`). `fundo_rosto.png` e
`camada_coroa.png` continuam só na animação de `/campeao`.
