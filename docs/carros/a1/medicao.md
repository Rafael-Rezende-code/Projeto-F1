# Entrada do carro: medição antes × depois (feat/carros A1)

Build de produção local, Chromium headless (compositor por software, sem GPU), 1440×900, DPR 1. Trace do Chrome por
página; "quadro" = intervalo entre quadros apresentados (`SubmitCompositorFrameToPresentationCompositorFrame`) entre o
início e o fim da entrada do carro. Tempos em ms desde o início da navegação. "4×" = CPU 4× mais lenta (DevTools).
Scripts da medição: trace (`Tracing`) + marcas `apex:assinatura-inicio`, `apex:carro-inicio` e `apex:carro-fim`
(`performance.mark`, ficam no código para medir de novo).

## Resumo

| | Antes | Depois |
| --- | --- | --- |
| Carro começa depois do início da assinatura | ~2 170–2 230 ms | **~355 ms** (1×) / 360–430 ms (4×) |
| Duração da entrada | 1,35 s | 1,5 s |
| Maior intervalo, sem limitação | 20–24 ms | 19–38 ms (no máximo 1 quadro acima de 33 ms por execução) |
| Maior intervalo, CPU 4× | 20–43 ms | 20–34 ms |
| Quadros acima de 33 ms com CPU 4× (meta: no máximo 2) | 0–1 | **0–1 em todas as 8 execuções** |
| Animação de `filter` | rastros com troca de camada | nenhuma (fantasma com desfoque estático) |

**Meta "nenhum quadro acima de 20 ms sem limitação": não atendida de forma estável neste ambiente.** As execuções têm 0 a 3
quadros acima de 20 ms e, às vezes, um quadro de 33–38 ms (uma batida de vsync perdida). Não há tarefa longa na thread
principal durante a entrada; o custo é o desenho do compositor por software (`DirectRenderer::DrawFrame` de 8–13 ms em
média, **igual antes e durante a entrada**: o carro não aumenta o custo de desenho). Em máquina com GPU esse passo leva
~1 ms. A versão intermediária (MotionValue escrevendo o estilo a cada quadro) teve um quadro de 60 ms com CPU 4× por
disputar a thread principal com a assinatura e a hidratação; a versão final roda no compositor (WAAPI).

## O que mudou

- Um relógio só (`lib/car-motion.ts`): t linear 0 → 1; posição, skew, fantasma, sombra e revelação do texto são funções
  dele, amostradas em keyframes e executadas como animações WAAPI criadas na mesma tarefa (mesmo instante de início).
- Disparo pelo **início da assinatura** + 0,35 s, esperando `img.decode()` (sem atraso fixo).
- Desfoque do fantasma num filho não composto (raster uma vez); camadas aquecidas (`will-change`) durante a espera de
  0,35 s e liberadas no fim.

GIFs (tempo real, 30 fps): `antes-*-desktop.gif`, `depois-*-desktop.gif`, `depois-*-celular.gif`.

## Execuções

ANTES
| Piloto | CPU | Início da assinatura (ms) | Início do carro (ms) | Fim (ms) | Carro após assinatura (ms) | Duração (ms) | Maior intervalo (ms) | Quadros > 20 ms | Quadros > 33 ms |
|---|---|---|---|---|---|---|---|---|---|
| norris | 1× | 814 | 3047 | 4397 | 2233 | 1350 | 24 | 2 | 0 |
| verstappen | 1× | 870 | 3103 | 4453 | 2233 | 1350 | 21 | 1 | 0 |
| hamilton | 1× | 963 | 3130 | 4496 | 2167 | 1367 | 20 | 0 | 0 |
| bortoleto | 1× | 804 | 3020 | 4387 | 2217 | 1367 | 20 | 0 | 0 |
| norris | 4× | 1654 | 3837 | 5187 | 2183 | 1350 | 26 | 4 | 0 |
| verstappen | 4× | 1845 | 4012 | 5345 | 2167 | 1333 | 30 | 2 | 0 |
| hamilton | 4× | 1923 | 4090 | 5440 | 2167 | 1350 | 43 | 6 | 1 |
| bortoleto | 4× | 1936 | 4086 | 5419 | 2150 | 1333 | 20 | 0 | 0 |

DEPOIS
| Piloto | CPU | Início da assinatura (ms) | Início do carro (ms) | Fim (ms) | Carro após assinatura (ms) | Duração (ms) | Maior intervalo (ms) | Quadros > 20 ms | Quadros > 33 ms |
|---|---|---|---|---|---|---|---|---|---|
| norris | 1× | 947 | 1302 | 2834 | 355 | 1532 | 33 | 3 | 1 |
| verstappen | 1× | 815 | 1168 | 2712 | 354 | 1544 | 21 | 2 | 0 |
| hamilton | 1× | 817 | 1171 | 2730 | 353 | 1560 | 19 | 0 | 0 |
| bortoleto | 1× | 823 | 1178 | 2714 | 355 | 1536 | 24 | 2 | 0 |
| norris | 4× | 1656 | 2032 | 3560 | 376 | 1528 | 31 | 4 | 0 |
| verstappen | 4× | 1625 | 2019 | 3553 | 394 | 1535 | 20 | 0 | 0 |
| hamilton | 4× | 1760 | 2125 | 3656 | 365 | 1531 | 21 | 1 | 0 |
| bortoleto | 4× | 1432 | 1817 | 3357 | 385 | 1540 | 34 | 4 | 1 |
| norris | 1× | 819 | 1172 | 2723 | 353 | 1551 | 19 | 0 | 0 |
| verstappen | 1× | 810 | 1164 | 2695 | 355 | 1530 | 33 | 2 | 1 |
| hamilton | 1× | 813 | 1167 | 2697 | 354 | 1531 | 34 | 3 | 1 |
| bortoleto | 1× | 863 | 1217 | 2780 | 355 | 1563 | 38 | 1 | 1 |
| norris | 4× | 1707 | 2091 | 3602 | 384 | 1511 | 31 | 5 | 0 |
| verstappen | 4× | 1718 | 2106 | 3641 | 388 | 1534 | 25 | 3 | 0 |
| hamilton | 4× | 1842 | 2208 | 3750 | 366 | 1542 | 31 | 3 | 0 |
| bortoleto | 4× | 1705 | 2077 | 3610 | 371 | 1533 | 34 | 2 | 1 |
