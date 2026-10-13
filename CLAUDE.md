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
  expo). Dados, efeitos e duração em `lib/drivers.ts`; fotos em `public/images/pilotos`.
- `LogoMarquee` / `TeamMarquee`: faixa de equipes abaixo da seção de pilotos. Lista em `lib/f1-teams.ts`;
  equipe sem `src` aparece com o nome em texto.

## Decisões já tomadas

- KineticText e TechText: descartados por ora.
- GlyphPortal ("VELOCIDADE", campo vermelho): adiado. Falhou no v0. Será refeito depois, com teste no
  navegador, como seção própria antes de "Luzes apagadas".
- **Licenciamento pendente:** as fotos em `public/images/editorial` são placeholders e precisam de
  licenciamento antes do lançamento comercial.

## Notas técnicas

- Gerenciador: pnpm (versão em `packageManager` do `package.json`; usar via `corepack pnpm` se o `pnpm`
  não estiver no PATH). Dev: `corepack pnpm dev`. Build: `corepack pnpm build`.
- Não há script de lint nem ESLint configurado; até isso mudar, usar `npx tsc --noEmit` como checagem.
- `next.config.mjs` tem `typescript.ignoreBuildErrors: true` (o build não falha por erro de tipo). O
  `images.unoptimized` foi removido na tarefa dos pilotos: o `next/image` otimiza (use `sizes` corretos).
- Registry `@componentry` (https://componentry.fun/r/{name}.json) configurado no `components.json`.
- `components/ui/hover-transition.tsx` (do @componentry) recebeu a prop opcional `active` (modo
  controlado). Se reinstalar pelo shadcn, reaplicar.
- O tema escuro do Tailwind (`dark:`) só ativa com a classe `.dark`; as variáveis CSS (`--foreground`
  etc.) também mudam com `prefers-color-scheme: dark`. As seções usam cores fixas (`bg-white`, `#111`).
- Toda a página fica em `app/page.tsx` (client component).
- **Pendência de performance (aguardando aprovação):** o spotlight do hero (`RevealLayer` em `app/page.tsx`)
  gera um PNG com `canvas.toDataURL` a cada frame enquanto o mouse se move (e por ~1 s depois, pela
  suavização), mesmo com o hero fora da tela; a página inteira re-renderiza a cada frame. Isso trava
  animações no resto da página. Por isso `DriversSection` é `memo`.
