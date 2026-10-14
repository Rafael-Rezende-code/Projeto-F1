# Apex (nome provisório)

Site de venda de artigos de Fórmula 1 em Next.js + Tailwind (+ shadcn), criado no v0 e baixado como zip.
Publicado em https://apex-seven-ruddy.vercel.app. A partir de agora todo o desenvolvimento é feito aqui,
**um componente por vez**.

## Regras do projeto

- Integração incremental. **Não** recriar o site, não refatorar, não trocar layout, fontes, cores, navbar
  ou footer, não remover seções nem conteúdo.
- Alterar só o que a tarefa pede. Melhorias fora do escopo: sugerir, não aplicar.
- Componentes reutilizáveis em `components/ui`. Dados/configuração separados dos componentes (ex.: `lib/`).
- Instalar dependências só se não existirem no `package.json`.
- Respeitar `prefers-reduced-motion`, acessibilidade (aria, foco por teclado, contraste) e mobile.
  Nunca causar scroll horizontal na página.
- Ao terminar cada tarefa: rodar build e lint, abrir o site em dev, conferir desktop e mobile e checar o
  console (sem erros de hydration).

## Estado atual (já integrado)

- `AnimatedGridPattern` (`components/ui/animated-grid-pattern.tsx`) como fundo da seção da newsletter
  ("Fique no grid / Não perca a próxima volta").
- Seção "Os pilotos / Escolha seu piloto" (`components/drivers-section.tsx`) logo abaixo do hero: 4 cards
  `rounded-2xl` com `HoverTransition`, um efeito por piloto (ripple, strips, curtain, wipe; 0,5 s, ease-out
  expo; Hamilton com 0,95 s e curva própria ease-in-out, para a cortina abrir em ~0,48 s). Dados, efeitos,
  duração e curva em `lib/drivers.ts`; fotos em `public/images/pilotos` (servidas em AVIF/WebP q90).
- `LogoMarquee` / `TeamMarquee`: faixa de equipes abaixo da seção de pilotos. Lista em `lib/f1-teams.ts`;
  equipe sem `src` aparece com o nome em texto. Logos reais: Ferrari, Mercedes, Red Bull e Audi (pretas a
  55%, 100% no hover do item; `displayHeight` dá a altura óptica). Arquivos em `public/images/logos-equipes`
  já recortados (sem margem), em minúsculas e com ~3× a altura exibida; originais em
  `assets/logos-equipes-originais` (fora do deploy). O hover desacelera a faixa à metade. O leitor de tela lê
  uma lista única (`sr-only`); a faixa animada é `aria-hidden`.
  **McLaren pendente:** `mclaren.jpg` tem fundo branco sólido; quando chegar `mclaren.svg` (ou PNG
  transparente), usar o novo e apagar o `.jpg`.

## Decisões já tomadas

- KineticText e TechText: descartados por ora.
- GlyphPortal ("VELOCIDADE", campo vermelho): adiado. Falhou no v0. Será refeito depois, com teste no
  navegador, como seção própria antes de "Luzes apagadas".
- **Licenciamento pendente:** as fotos em `public/images/editorial` são placeholders e precisam de
  licenciamento antes do lançamento comercial (antes da venda). Em uso: `abraco-redbull-ferrari` ("Mais que
  uma corrida", #story), `senna-pneus` ("Cada detalhe importa") e `verstappen-capacete` ("Luzes apagadas",
  #journal). `senna-sentado` e `senna-champanhe` aguardam uma seção "Diário" de verdade (o #journal atual é
  a seção "Luzes apagadas"). Dados em `lib/editorial.ts`. Os originais têm só 1170px de largura, em retrato:
  nas seções de largura total o navegador amplia a foto (1,2× em 1440px, 2,4× em tela retina); para nitidez
  plena, trocar por originais com ≥ 2880px de largura.

## Notas técnicas

- Gerenciador: pnpm (versão em `packageManager` do `package.json`; usar via `corepack pnpm` se o `pnpm`
  não estiver no PATH). Dev: `corepack pnpm dev`. Build: `corepack pnpm build`.
- Não há script de lint nem ESLint configurado; até isso mudar, usar `npx tsc --noEmit` como checagem.
- `next.config.mjs` tem `typescript.ignoreBuildErrors: true` (o build não falha por erro de tipo). O
  `next/image` otimiza (sem `unoptimized`), com `formats` AVIF/WebP e `qualities: [75, 90]` (o Next 16 só
  aceita qualidades listadas). Depois de mudar o `next.config`, reinicie o dev server: o otimizador de
  imagens pode ficar travado no restart automático.
- Fotos dos pilotos: `sizes` = largura real do card × 1,5 (sobreamostragem medida: o navegador borra ao
  reduzir perto de 1:1). Não "corrigir" para 1× sem medir a nitidez de novo.
- Registry `@componentry` (https://componentry.fun/r/{name}.json) configurado no `components.json`.
- `components/ui/hover-transition.tsx` (do @componentry) recebeu a prop opcional `active` (modo
  controlado). Se reinstalar pelo shadcn, reaplicar.
- O site **não tem modo escuro**: os fundos das seções são fixos e iguais nos dois temas. Mas as variáveis
  CSS (`--foreground` etc.) mudam com `prefers-color-scheme: dark`, então texto sem cor própria herda branco
  no modo escuro do sistema. Em componentes novos, use cores fixas (`text-black`, `text-white`), nunca
  `text-foreground` nem `dark:`. Hoje nenhum texto ou ícone visível da página muda de cor com o tema.
- `LogoMarquee` (`InfiniteSlider`): `durationOnHover` maior que `duration` desacelera. A transição de
  velocidade dividia a distância por `contentSize` em vez de `contentSize / 2` (corrigido).
- Toda a página fica em `app/page.tsx` (client component).
- Spotlight do hero (`RevealLayer` em `app/page.tsx`): máscara CSS `radial-gradient` posicionada por
  `--spot-x`/`--spot-y` (antes era um PNG gerado por canvas a cada frame, que travava a página). O loop
  `requestAnimationFrame` pausa quando o hero sai da tela (IntersectionObserver). Com o hero visível, a
  página ainda re-renderiza a cada frame; por isso `DriversSection` é `memo`.
