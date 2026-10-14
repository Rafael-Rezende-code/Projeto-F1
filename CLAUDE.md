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
- **Animações sempre ligadas (decisão de produto):** faixa, hover dos cards, spotlight, quadrados da newsletter
  e as demais animam mesmo com `prefers-reduced-motion: reduce`. **Exceção:** animações que movem a tela inteira
  com o scroll (ex.: GlyphPortal "VELOCIDADE") devem respeitar reduced motion.
- Respeitar acessibilidade (aria, foco por teclado, contraste) e mobile.
  Nunca causar scroll horizontal na página.
- Ao terminar cada tarefa: rodar build e lint, abrir o site em dev, conferir desktop e mobile e checar o
  console (sem erros de hydration).

## Padrão de arredondamento

| Elemento | Classe |
| --- | --- |
| Cards e imagens em bloco (produto, categoria, equipe, piloto) | `rounded-2xl` |
| Botões e campos (CTAs, setas, favorito, "Adicionar à sacola", input e botão da newsletter, aviso da sacola) | `rounded-xl` |
| Selos e etiquetas pequenas ("NOVO") | `rounded-md` |
| Contador da sacola (círculo) | `rounded-full` |
| Seções de largura total (hero, "Mais que uma corrida", "Luzes apagadas", fundos) | retas |
| Imagens que encostam nas bordas da seção (ex.: imagem do Senna em "Cada detalhe importa") | retas |

Card com imagem ou efeito arredondado leva `overflow-hidden` (e `isolate` quando a imagem tem zoom no hover, para
o Safari não vazar os cantos). O contorno de foco (`outline`) acompanha o `border-radius` sozinho; não use `ring`
em elemento sem o mesmo arredondamento. **Imagens que encostam nas bordas da seção ficam retas** (sem margem
interna e sem arredondamento).
- Carrossel horizontal: a área de scroll sangra até as bordas da janela (o corte do último card acontece na borda
  da tela) e o primeiro card fica alinhado ao título via padding/scroll-padding (ver `CAROUSEL_BLEED` em
  `app/page.tsx`).

## Estado atual (já integrado)

- `AnimatedGridPattern` (`components/ui/animated-grid-pattern.tsx`) como fundo da seção da newsletter
  ("Fique no grid / Não perca a próxima volta").
- Seção "Os pilotos / Escolha seu piloto" (`components/drivers-section.tsx`) logo abaixo do hero: 4 cards
  `rounded-2xl` com `HoverTransition`, um efeito por piloto (ripple, strips, curtain, wipe; 0,5 s, ease-out
  expo; Hamilton com 0,95 s e curva própria ease-in-out, para a cortina abrir em ~0,48 s). Dados, efeitos,
  duração e curva em `lib/drivers.ts`; fotos em `public/images/pilotos` (servidas em AVIF/WebP q90).
- `LogoMarquee` / `TeamMarquee`: faixa de equipes logo abaixo dos cards de pilotos, como uma assinatura (sem
  bordas; 64px dos cards até a faixa no desktop, 48px no celular; ~110px da faixa até "Explore a coleção" no
  desktop, ~95px no celular). Lista em `lib/f1-teams.ts`;
  equipe sem `src` aparece com o nome em texto. Logos reais (pretas a 55%, 100% no hover do item;
  `displayHeight` dá a altura óptica): as 11 equipes (Ferrari, Mercedes, McLaren, Red Bull, Aston Martin, Williams,
  Alpine, Haas, Racing Bulls, Audi e Cadillac). Arquivos em `public/images/logos-equipes` já recortados (sem margem), em minúsculas, WebP sem
  perdas com ~3× a altura exibida (a Ferrari só tem 2,4×: o desenho original tem 59px de altura); originais em `assets/logos-equipes-originais` (fora do deploy). O hover
  desacelera a faixa à metade. O leitor de tela lê uma lista única (`sr-only`); a faixa animada é `aria-hidden`.
  A Cadillac usa o arquivo `cadillac-wordmark` (versão branca, com escudo e nome); o `cadillac.png` antigo
  (escudo que virava massa preta) ficou só em `assets/`.
- Grade "Com quem você corre?" (#teams): versão A (flat) com as 11 equipes, 4 + 4 + 3 centralizado (2 por linha no
  celular, a última centralizada). Card (`components/team-card.tsx`) na cor da equipe, logo e nome **sempre brancos**
  (nome grande, ≥ 18,7px em negrito); hover escurece a cor e sobe a logo 4px; leva a `/equipes/[slug]`. Cores e
  identidade em `lib/teams.ts` (`color` = cor do card, escurecida o mínimo para o branco atingir 3:1 quando
  necessário). As fotos 3D antigas ficaram em `assets/equipes-fotos-3d/` (fora do deploy).
- Seção "VELOCIDADE" logo antes de "Luzes apagadas": `GlyphPortal` (`components/ui/glyph-portal.tsx`, de terceiro,
  MIT; **não alterar lógica nem CSS interno**) montado por `components/velocidade-portal.tsx` com `next/dynamic` e
  `ssr: false` (evita o hydration mismatch do `useId`) e placeholder de 100svh. Papel/tinta iguais à seção anterior
  (#f5f5f3 / preto), campo vermelho #c8102e com gradiente próprio, conteúdo "Cada décimo conta." + link para
  #collection. Respeita reduced motion (fica estático, conteúdo no fluxo). O pin usa `position: sticky`: **nenhum
  ancestral pode ter overflow hidden/auto, transform ou filter** (para cortar overflow horizontal, use
  `overflow-x-clip`).
- Título "Luzes apagadas." (#journal) com `KineticText` (`components/ui/kinetic-text.tsx`): só em desktop com
  mouse (`lg` + `hover:hover`); no celular/toque fica o `h2` original, sem efeito. Usa a Inter variável 100–900
  apenas nesse título (`lib/fonts.ts`, `next/font/local`, arquivo em `app/fonts/`, classe `.font-kinetic` no
  `globals.css`). O `next/font/google` não serve aqui: registra a família como "Inter" e vazaria para o site todo.

## Decisões já tomadas

- TechText: descartado por ora. KineticText: só no título "Luzes apagadas." (ver Estado atual).
- **Inter e Playfair nunca carregaram; site usa fonte do sistema. Decisão de tipografia pendente para rodada
  própria.** (O `@import` do Google Fonts em `app/globals.css` não chega ao CSS final.)
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

## Catálogo (lib/catalog)

- Tipos em `lib/catalog/types.ts` (Product, Category, Team, Driver, filtros). **Preços sempre em centavos**
  (inteiro); formatação só via `formatPrice` (`lib/format.ts`, `Intl.NumberFormat("pt-BR")`).
- Interface `CatalogRepository` (`lib/catalog/repository.ts`); as páginas usam só `catalog` de `lib/catalog`
  (`index.ts`). Implementação atual: `SeedCatalogRepository` lendo `lib/catalog/seed/`.
- **Seed ilustrativo:** os 66 produtos do seed são de demonstração (`illustrative: true`): os 6 que já estavam na
  home, 4 por equipe (11 equipes) e 4 por piloto. Fotos só das imagens que o site já usava
  (`lib/catalog/seed/images.ts`); não acrescente URLs sem conferir licença e `remotePatterns`.
- Identidade das equipes (cor, logo) continua em `lib/teams.ts`; o seed só a expõe como `Team`. Pilotos vêm de
  `lib/drivers.ts` (cards da home) + o mapa de equipe em `lib/catalog/seed/drivers.ts`.

### Como trocar o seed por Supabase

1. Criar as tabelas `categories`, `teams`, `drivers`, `products` e `product_variants` (sku único, size, color,
   stock, product_id) e `product_images` (src, alt, position), espelhando `lib/catalog/types.ts` (preços em
   centavos, `integer`). Popular a partir do seed (script que lê `lib/catalog/seed/` e faz `insert`).
2. Instalar `@supabase/supabase-js` e criar `lib/catalog/supabase-repository.ts` com uma classe que implemente
   `CatalogRepository`: cada método vira uma consulta (filtros de `getProducts` → `.eq`/`.gte`/`.lte`, ordenação →
   `.order`), mapeando as linhas para os tipos.
3. Em `lib/catalog/index.ts`, trocar `new SeedCatalogRepository()` pela nova classe. Nenhuma página muda.
4. Chaves em variáveis de ambiente (`SUPABASE_URL`, `SUPABASE_ANON_KEY`; service role só no servidor). As páginas
   de catálogo hoje são estáticas (`generateStaticParams`): com banco, usar `revalidate` (ISR) ou revalidação por tag.
5. Estoque: o checkout (`app/(loja)/checkout/actions.ts`) já revalida preço e estoque pelo repositório no servidor;
   com banco, a baixa de estoque deve ser feita numa transação/RPC ao confirmar o pagamento.

## Decisões tomadas sem consulta

Decisões tomadas durante o trabalho autônomo (branch `feat/loja`), para revisão.

- **Cores das equipes (fase 1):** só a McLaren precisou escurecer (`#FF8000` → `#E77400`, 10%). Mercedes
  (`#00A19C`, 3,2:1) e Alpine (`#0090FF`, 3,3:1) já passam de 3:1 com branco, então ficaram com a cor original
  (o pedido era o mínimo necessário). Para 3:1 valer pela WCAG, o nome no card passou a ser texto grande (19–20px,
  negrito) em vez do rótulo pequeno do mockup.
- **Seed (fase 2):** produtos por equipe são camiseta, boné, moletom e jaqueta; por piloto, camiseta, boné, miniatura
  de capacete 1:5 e pôster (foto do piloto). Estoques determinísticos com alguns tamanhos esgotados, para exercitar
  a interface. Slugs dos pilotos seguem os de `lib/drivers.ts` (`/pilotos/norris` etc.).

## Notas técnicas

- Gerenciador: pnpm (versão em `packageManager` do `package.json`; usar via `corepack pnpm` se o `pnpm`
  não estiver no PATH). Dev: `corepack pnpm dev`. Build: `corepack pnpm build`.
- Lint: `corepack pnpm lint` (ESLint 9 + `eslint-config-next`, config padrão em `eslint.config.mjs`; o ESLint
  10 ainda não é suportado pelos plugins do Next). Rodar também `npx tsc --noEmit`, porque o build ignora erros
  de tipo. Avisos conhecidos (intencionais): `<img>` em `LogoItem` (logos pequenas, monocromáticas) e `pin` sem uso no
  `glyph-portal.tsx` (de terceiro). A regra `react-hooks/immutability` está desligada só para o `glyph-portal.tsx`
  no `eslint.config.mjs` (falso positivo num contador local durante o render).
- `next.config.mjs` tem `typescript.ignoreBuildErrors: true` (o build não falha por erro de tipo). O
  `next/image` otimiza (sem `unoptimized`), com `formats` AVIF/WebP e `qualities: [75, 90]` (o Next 16 só
  aceita qualidades listadas). Depois de mudar o `next.config`, reinicie o dev server: o otimizador de
  imagens pode ficar travado no restart automático.
- Fotos dos pilotos: `sizes` = largura real do card × 1,5 (sobreamostragem medida: o navegador borra ao
  reduzir perto de 1:1). Não "corrigir" para 1× sem medir a nitidez de novo.
- Registry `@componentry` (https://componentry.fun/r/{name}.json) configurado no `components.json`.
- `components/ui/hover-transition.tsx` (do @componentry) recebeu as props opcionais `respectReducedMotion` (os
  cards passam `false`) e `active` (modo
  controlado). Se reinstalar pelo shadcn, reaplicar.
- O site **não tem modo escuro**: os fundos das seções são fixos e iguais nos dois temas. Mas as variáveis
  CSS (`--foreground` etc.) mudam com `prefers-color-scheme: dark`, então texto sem cor própria herda branco
  no modo escuro do sistema. Em componentes novos, use cores fixas (`text-black`, `text-white`), nunca
  `text-foreground` nem `dark:`. Hoje nenhum texto ou ícone visível da página muda de cor com o tema.
- `LogoMarquee` (`InfiniteSlider`): `durationOnHover` maior que `duration` desacelera. A transição de
  velocidade dividia a distância por `contentSize` em vez de `contentSize / 2` (corrigido).
- `app/page.tsx` é **server component**. Client só onde há interatividade: `components/spotlight.tsx` (hero),
  `components/cart.tsx` (sacola: provider, botão do cabeçalho, botão de adicionar e aviso),
  `components/team-marquee.tsx`, `components/newsletter-form.tsx` e `components/drivers-section.tsx`. Em
  componente novo, só use `'use client'` se precisar de estado, efeito ou evento.
- Spotlight do hero (`components/spotlight.tsx`): máscara CSS `radial-gradient` posicionada por
  `--spot-x`/`--spot-y`, escritas direto na div via ref dentro do `requestAnimationFrame`, **sem setState**
  (a página não re-renderiza a cada frame). O loop pausa quando o hero sai da tela (IntersectionObserver).
  Antes do primeiro movimento do mouse a camada fica sem máscara (comportamento original do v0).

## Roteiro (próximos passos, em ordem)

1. **Tipografia:** decidir e carregar as fontes do site (hoje Inter e Playfair não carregam; o site usa a fonte do
   sistema). Só o título "Luzes apagadas." usa a Inter variável, via `lib/fonts.ts`.
2. **Refinar os cards de pilotos.**
3. **Página de produto.**
4. **Seção "Diário"**, com as fotos `senna-sentado` e `senna-champanhe`.
5. **Licenciamento antes da venda:** fotos editoriais (originais ≥ 2880px de largura), fotos dos pilotos e das
   equipes.

## Pendências (atualizado em 14/10/2026)

- **Branch `perf/server-components`:** aguardando teste na prévia da Vercel e aprovação para merge na `main`.
- **Fotos editoriais:** placeholders (licenciar antes da venda); `senna-sentado` e `senna-champanhe` aguardam
  a seção "Diário".
- O 404 de `/_vercel/insights/script.js` só ocorre localmente.
