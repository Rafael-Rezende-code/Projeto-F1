# Lighthouse mobile (22/10/2026)

Build de produção local (`next start`), Lighthouse 12.8.2, Chromium 141 headless, perfil mobile padrão (simulação de
4G lenta + CPU 4×). 3 execuções por página; vale a mediana. A rodada anterior foi medida em outra máquina (Edge no
Windows): os números não são comparáveis entre máquinas, por isso a `main` de antes (4dd82e2) foi medida aqui também.

| Página | Execuções (Performance) | Mediana | Acessibilidade | Boas práticas | SEO | LCP (mediana) | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home (esta rodada) | 85, 99, 98 | **98** | 100 | 96 | 100 | 1.9 s | 0.001 |
| Home (main antes da rodada) | 91, 99, 98 | **98** | 100 | 96 | 100 | 1.4 s | 0.001 |
| /pilotos/hamilton (esta rodada) | 87, 86, 88 | **87** | 97 | 96 | 100 | 3.8 s | 0.000 |
| /pilotos/hamilton (main antes) | 84, 86, 88 | **86** | 96 | 96 | 100 | 3.9 s | 0.000 |
| /diario/senna-e-a-mclaren | 89, 84, 94 | **89** | 100 | 96 | 100 | 3.6 s | 0.006 |

Boas práticas 96 = 404 do `/_vercel/insights/script.js` (só existe na Vercel). Acessibilidade 97 no piloto: contraste
de textos em branco translúcido do cabeçalho (caminho `white/70`, link da equipe `white/80`, frase `white/85`) sobre
cores de equipe como o vermelho da Ferrari. Já existiam antes da rodada (a `main` dava 96); ver pendências.
