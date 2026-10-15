# Comparação de tipografia (não aplicada)

Prints da home (hero, seção de cards "Feita em torno da corrida." e manifesto "Mais que uma corrida.") com:

- `archivo-geist-*`: **aplicada** (Archivo variável expandida nos títulos + Geist nos textos).
- `inter-tight-inter-*`: alternativa (a), Inter Tight + Inter.
- `space-grotesk-geist-*`: alternativa (b), Space Grotesk + Geist.

Folhas lado a lado: `comparacao-desktop.jpg` (1440px) e `comparacao-celular.jpg` (390px).
As alternativas foram injetadas só no navegador de teste (Google Fonts + troca das variáveis `--font-display`/`--font-sans`);
nada delas está no código. Para adotar uma, troque as fontes em `lib/fonts.ts`.
