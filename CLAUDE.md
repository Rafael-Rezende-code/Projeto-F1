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
  equipe sem `src` aparece com o nome em texto. Logos reais (pretas a 55%, 100% no hover do item;
  `displayHeight` dá a altura óptica): as 11 equipes (Ferrari, Mercedes, McLaren, Red Bull, Aston Martin, Williams,
  Alpine, Haas, Racing Bulls, Audi e Cadillac). Arquivos em `public/images/logos-equipes` já recortados (sem margem), em minúsculas, WebP sem
  perdas com ~3× a altura exibida; originais em `assets/logos-equipes-originais` (fora do deploy). O hover
  desacelera a faixa à metade. O leitor de tela lê uma lista única (`sr-only`); a faixa animada é `aria-hidden`.
  A Cadillac usa o arquivo `cadillac-wordmark` (versão branca, com escudo e nome); o `cadillac.png` antigo
  (escudo que virava massa preta) ficou só em `assets/`.

## Decisões já tomadas

- KineticText e TechText: descartados por ora.
- GlyphPortal ("VELOCIDADE", campo vermelho): adiado. Falhou no v0. Será refeito depois, com teste no
  navegador, como seção própria antes de "Luzes apagadas".
- **Licenciamento pendente:** as fotos em `public/images/editorial` são placeholders e precisam de
  licenciamento antes do lançamento comercial (antes da venda). Em uso: `abraco-redbull-ferrari` ("Mais que
  uma corrida", #story), `senna-pneus` ("Cada detalhe importa") e `verstappen-capacete` ("Luzes apagadas",
  #journal). `senna-sentado` e `senna-champanhe` aguardam uma seção "Diário" de verdade (o #journal atual é
  a seção "Luzes apagadas"). Dados em `lib/editorial.ts`, com direção de arte por breakpoint:
  foto vertical (1170px) no celular/tablet (<1024px) e foto horizontal (`*-desktop.png`, 1672px) no desktop, via
  `components/ui/art-directed-image.tsx` (<picture> + getImageProps: baixa só uma). Para trocar a foto do
  desktop, colocar o arquivo horizontal em `public/images/editorial/` e mudar o `src` do `desktop` em
  `lib/editorial.ts`. A `senna-pneus` (lateral) usa só a vertical: no desktop é reduzida (0,62× em DPR 1) e
  ampliada 1,23× em DPR 2. Em retina (DPR 2) as fotos de largura total ainda são ampliadas (1672px para
  2850px). **Fotos editoriais de largura total precisam de originais com ≥ 2880px de largura para nitidez em
  retina: considerar isso na compra das licenças.**

## Notas técnicas

- Gerenciador: pnpm (versão em `packageManager` do `package.json`; usar via `corepack pnpm` se o `pnpm`
  não estiver no PATH). Dev: `corepack pnpm dev`. Build: `corepack pnpm build`.
- Lint: `corepack pnpm lint` (ESLint 9 + `eslint-config-next`, config padrão em `eslint.config.mjs`; o ESLint
  10 ainda não é suportado pelos plugins do Next). Rodar também `npx tsc --noEmit`, porque o build ignora erros
  de tipo. Aviso conhecido (intencional): `<img>` em `LogoItem` (logos pequenas, monocromáticas).
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
  `--spot-x`/`--spot-y`, escritas direto na div via ref dentro do `requestAnimationFrame`, **sem setState**
  (a página não re-renderiza a cada frame). O loop pausa quando o hero sai da tela (IntersectionObserver).
  Antes do primeiro movimento do mouse a camada fica sem máscara (comportamento original do v0).

## Pendências (atualizado em 14/10/2026)

- **KineticText ("Luzes apagadas."):** o componente existe em `components/ui/kinetic-text.tsx`, mas **não está
  aplicado**. A Inter vem do Google Fonts com pesos estáticos 300–700 (`app/globals.css`); o efeito usa 300 a
  900, então o 900 cairia em 700. Para funcionar, trocar o import para a Inter variável (`wght@100..900`), o
  que mexe na configuração de fontes; aguardando decisão.
- **GitHub:** o repositório ainda não tem remote. Quando houver a URL do repositório vazio: `git remote add
  origin <url>`, branch `main` e `git push -u origin main`.
- **Fotos editoriais:** placeholders (licenciar antes da venda); `senna-sentado` e `senna-champanhe` aguardam
  uma seção "Diário". Para nitidez plena em retina, originais horizontais com ≥ 2880px.
- **Lighthouse mobile (build de produção, local, 3 execuções):** Performance 69–76, Acessibilidade 100, Boas
  práticas 96, SEO 100. O bloqueio de thread (TBT) oscila de 970 a 2280 ms entre execuções nesta máquina; o
  custo está na hidratação da página inteira como um único componente client e na renderização, não em JS
  isolado. Reduzir de verdade exigiria dividir `app/page.tsx` em componentes de servidor e de cliente
  (refatoração, fora do escopo até aprovação). O 404 de `/_vercel/insights/script.js` só ocorre localmente.
