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
  mouse (`lg` + `hover:hover`); no celular/toque fica o `h2` original, sem efeito. Usa a Archivo variável (classe
  `.font-kinetic` no `globals.css`, que também fixa o peso inicial 300).
- **Tipografia (polimento, fase 1; atualizada na rodada 2):** tokens em `lib/fonts.ts`: **Archivo** variável (arquivo local
  enxuto: largura 106–125, peso 300–900, gerado por `scripts/fonts/subset.cjs`) nos títulos (`--font-display`) e **Geist** em textos, interface e preços
  (`--font-sans`, local enxuta: peso 400–700). Ajustes finos em `:root` no `globals.css`: `--display-stretch` 116% (106% abaixo de 640px, para os
  títulos grandes não encostarem nas bordas), `--display-weight` 600, `--display-tracking` -0,035em, `--display-leading`
  0,98, `--body-tracking`. A regra de `h1, h2, .font-display` fica **fora de @layer** e vence as utilities antigas dos
  títulos (`font-medium`, `tracking-[...]`, `leading-[...]`). Títulos pequenos de interface usam `.font-ui`. O acento
  em serifa itálica (`.font-playfair`/`.font-accent`) é a **Playfair Display Italic** real (ver "Decisões da rodada 2").
  Comparação com Inter Tight + Inter e Space Grotesk + Geist em `docs/tipografia/` (não aplicadas).
- **Hero tem tipografia própria; não alterar.** É a da `feat/loja` (como aparecia no dev e no v0): textos em Inter
  400/500 (`fontHero` em `lib/fonts.ts`, carregada só para o hero), tracking -0.02em, "Feita para" em Playfair Display
  Italic 400 e "pilotos" no itálico sintético da Inter (tracking -0.08em). Classe `.hero-type` na seção e `.hero-serif`
  no "Feita para" (`globals.css`). Comparação em `docs/ajustes/hero-tipografia-loja-vs-agora.jpg`. No build de produção
  da `feat/loja` o `@import` do Google Fonts era descartado (lá o site aparecia com as fontes do sistema); no dev ele
  funcionava.

- **Movimento (polimento, fase 2):** tokens em `lib/motion.ts` (durações, curvas, distâncias, stagger) espelhados em
  variáveis CSS (`--motion-*`, `--ease-*`) no `globals.css` — **use esses tokens em toda animação nova**. Títulos de seção
  entram com `SectionTitle` (`components/motion/section-title.tsx`, BlurReveal da Spell UI, uma vez ao entrar na tela);
  grades de cards com `RevealGroup` (`components/motion/reveal-group.tsx`: um IntersectionObserver por grade + CSS
  `[data-reveal]`, sem JS por card; grade já visível ao carregar não anima). WordsStagger nos parágrafos de "Mais que
  uma corrida." e "Cada detalhe importa.". **HighlightedText em no máximo 3 lugares**: "corrida" (Feita em torno da
  corrida.), "detalhe" (Cada detalhe importa.) e "grid" (O que o grid veste), barra laranja #b94f01 e texto branco.
- **Cabeçalho (polimento, fase 3; refeito em feat/ajustes):** `components/site-header.tsx` (client) é o cabeçalho de todas
  as páginas. **Desktop (md+):** cartão branco SÓLIDO flutuante (12px do topo, 16px das laterais, `rounded-2xl`, borda
  `black/10`, sombra suave), igual sobre o hero (`variant="overlay"`, fixo) e nas internas (`variant="solid"`, sticky no
  fluxo: não cobre o topo). Esconde ao rolar para baixo (depois de 120px) e volta ao rolar para cima ou ao receber foco
  (`focus-within` + `onFocusCapture`); não esconde enquanto um painel trava a rolagem; esconder é só `translateY`.
  **Celular (< 768px):** só a marca, pequena e centralizada, NÃO fixa (rola com a página): branca sobre o hero na home,
  preta no fluxo nas internas. Busca, sacola e menu ficam só no dock (`menu-button.tsx` foi removido). Prints em
  `docs/ajustes/cabecalho.jpg`.
- **Dock no celular (polimento, fase 4):** `components/mobile-dock.tsx` com o `MagneticDock` (`components/ui/magnetic-dock.tsx`,
  código recebido; mudanças: import `motion/react`, `aria-label`/`aria-current` no botão e elevação de 4px do item ativo).
  Só abaixo de 768px, variante glass, centralizado, acima de `env(safe-area-inset-bottom)`; ícones 44px, sem tooltip,
  sem efeito magnético (`maxScale` 1). Itens: Início, Buscar (abre a busca), Equipes, Sacola (badge = quantidade; abre
  a gaveta) e Menu. Escondido em `/checkout` e `/pedido`. `--dock-space` (globals.css) é o espaço que ele ocupa: há um
  espaçador na cor do rodapé no fim da página, e o aviso da sacola, o bloco de CTA do hero e a barra fixa de compra
  ficam acima dele.
- **Busca (polimento, fase 5):** `components/search-overlay.tsx` (sobreposição em tela cheia, montada no layout raiz).
  Abre com Ctrl/Cmd+K, com o ícone de lupa do cabeçalho e com o item Buscar do dock. Resultados enquanto digita (espera
  de 140 ms) via server action `app/actions/search.ts`, que usa `catalog.search` (novo método do repositório: todos os
  termos precisam aparecer em nome, equipe, piloto, categoria ou tags; sem acento/maiúsculas; testes em
  `lib/catalog/search.test.ts`). Padrão combobox + listbox: setas, Enter abre, Esc fecha. Estado vazio com equipes e
  pilotos; sem resultado com mensagem no tom do site.
- **Cards e página de produto (polimento, fase 6):** card de equipe sem o nome repetido (fica `sr-only`), logo maior,
  card mais baixo (proporção 1,7) e rótulo "VER COLEÇÃO →" numa pílula escura (contraste ≥ 5,6:1); no desktop, TiltCard
  (8°, scale 1,03, brilho) via `components/motion/tilt-on-hover.tsx` (só com hover + ponteiro fino). Card de produto:
  segunda foto no hover (no seed, placeholder marcado `illustrative`), favoritar (`components/favorites.tsx`,
  localStorage `apex:favoritos:v1` + `useSyncExternalStore`; página `/favoritos`) e chips de tamanho para compra
  rápida no hover do desktop (`components/quick-sizes.tsx`). Página de produto: lightbox nas fotos (setas, ← →, Esc),
  guia de tamanhos em modal (tabela placeholder `[MEDIDAS A CONFIRMAR]`), favoritar, barra fixa de compra no celular
  acima do dock (aparece quando o botão principal sai da tela) e "Complete o look" (até 4 relacionados, priorizando
  categorias diferentes).
- **Páginas dos pilotos (polimento, fase 7; refeito em feat/ajustes):** o nome é escrito a caneta pelo **Signature da
  Spell UI** (`components/ui/signature.tsx`, do registry; usado por `components/driver-signature.tsx`): o contorno de cada
  letra vira path SVG e é desenhado com pathLength da esquerda para a direita, com o preenchimento revelado por uma
  máscara logo atrás; ~2,2 s visíveis (o traço termina em 2,6 s), uma vez ao entrar na tela, pronto com reduced motion.
  **Contornos gerados no servidor (feat/pilotos):** `lib/signature-paths.ts` lê a fonte com o opentype.js no build (as
  páginas são estáticas) e a página passa os paths prontos ao `DriverSignature`; o cliente não baixa opentype.js nem a
  fonte (JS da página: 296 → 245 KB comprimido, −17%; e −53 KB de fonte). Fonte manuscrita **genérica** Great Vibes (SIL
  OFL) em `assets/fonts/greatvibes-latin.woff` (fora do `public/`; subconjunto latino; o opentype.js não lê WOFF2).
  **Espaço entre palavras:** cada palavra começa 0,32 em depois do fim da TINTA da anterior (o espaço da fonte, 0,17 em,
  deixava as laçadas emendarem: "GabrielBortoleto"). **opentype.js fixado em 1.3.4**: da 1.3.5 em diante `toPathData(3)`
  espera um objeto e as coordenadas viram NaN. Adaptações no componente, marcadas "APEX": paths prontos, `stagger`,
  viewBox pela caixa real dos glifos (sem cortes) e `still`. Nome em texto `sr-only` no h1. GIF em
  `docs/pilotos/assinaturas-4.gif`.
  **NUNCA imitar o autógrafo real de um piloto** (nem fonte, nem traçado, nem imagem de assinatura): é a assinatura
  dele, com implicações de direito de imagem e de falsificação. **Fotos da página (feat/pilotos):**
  `photoMain` e `photoSecondary` em `lib/drivers.ts` (`{ src, width, height, position }`), arquivos
  `public/images/pilotos/paginas/{slug}-principal.jpg` e `-secundaria.jpg` (todas verticais, ~1170px de largura; vieram
  como `.PNG` mas são JPEG, e foram renomeadas para minúsculas, `.jpg` e o slug do piloto). Topo: a orientação decide o
  layout (vertical: dividido, foto na metade direita com altura até 88svh/860px; horizontal: largura total); no celular
  o nome vem antes e o retrato tem altura controlada (até 62svh/520px). Sem gradiente nem fade sobre a foto. Meio: bloco
  editorial com a secundária (`rounded-2xl`, dentro do container) e "[TEXTO SOBRE O PILOTO]" (placeholder), com a cor
  da equipe como detalhe (fio e marcador). Depois, os produtos. next/image q90; `position` ajusta o enquadramento de
  cada foto. O fallback antigo (foto do card quando faltava o arquivo, detectado no build) foi removido. Ao trocar
  uma foto, atualize largura e altura em `lib/drivers.ts`.
- **View Transitions (polimento, fase 9):** `<ViewTransition>` do React canary embutido no Next 16 (sem flag de config),
  via `components/motion/view-transition.tsx` (`SharedTransition`; sem suporte, só renderiza o conteúdo; tipos em
  `types/react-canary.d.ts`). Imagem do card de produto → imagem principal da página (`produto-{slug}`); card do
  piloto → foto do cabeçalho da página (`piloto-{slug}`), **sem crossfade** (`crossfade={false}`: a mistura com o card,
  que tem gradiente escuro e o nome, deixava a foto esmaecida; agora ela aparece nítida desde o primeiro quadro e só o
  movimento anima; a foto da página não tem gradiente nenhum). **Nomes precisam ser únicos na tela**: o card só liga a
  transição com `transition` (grades e grade da home; o carrossel "O que o grid veste" não, porque repete produtos da
  grade). Os cards de piloto passaram a usar `next/link` (navegação SPA, necessária para a transição). Testado no build
  de produção: a transição começa, anima os elementos compartilhados e termina (~250 ms) sem travar cliques. Em Edge
  headless com `--disable-frame-rate-limit`/`--disable-gpu-vsync` as View Transitions congelam (até uma trivial): use o
  headless padrão para testar.
- **Marca (polimento, fase 10):** nome "Apex" (provisório) centralizado em `lib/brand.ts` (nome, ponto do logo,
  assinatura, descrição, cores de destaque) e usado no cabeçalho, rodapé, metadata (título padrão e template), JSON-LD,
  cartão decorativo, páginas institucionais, navegação, `lib/site.ts`/`lib/company.ts` e textos da home. Favicon
  (`app/icon.tsx`), apple-icon (`app/apple-icon.tsx`) e imagem Open Graph padrão (`app/opengraph-image.tsx`) são gerados
  por `next/og` a partir do nome (inicial + ponto laranja); trocar por arquivos quando houver logo. Os ícones antigos do
  v0 em `public/` (`icon*.png`, `icon.svg`, `apple-icon.png`) não são mais usados. O nome gigante no rodapé
  (`GiantWordmark`) foi removido em feat/ajustes: o rodapé voltou ao layout anterior (links + dados da empresa). 404 "Você saiu da pista." e estados vazios no mesmo tom (sacola "Nada no grid", favoritos "Garagem vazia",
  busca "Nada no radar").
- **QA e desempenho (polimento, fase 11):** e2e (`e2e/compra.spec.ts` e `e2e/busca-e-dock.spec.ts`) passa em desktop e
  celular, também contra o build de produção (`E2E_BASE_URL=http://localhost:3001`). Revisão em 1440, 1280, 820, 390 e
  360px sem scroll horizontal. fps no build de produção (limite de 60): scroll da home 59, hover dos cards 60.
  Lighthouse mobile (mediana de 3, mesma máquina e mesmo dia): home 85 (base `feat/loja` 87), produto 85 (base 96);
  Acessibilidade 100, Boas práticas 96, SEO 100 nas duas. A diferença vem quase toda das fontes web (Archivo variável com
  eixo de largura ≈ 88 KB + Geist ≈ 29 KB entram na cadeia crítica pelo CSS; a base usava as fontes do sistema porque
  Inter/Playfair nunca carregavam). Já aplicado para reduzir: Archivo sem itálica (−88 KB), Archivo e Geist sem
  preload, busca e menu carregados só ao abrir, dock carregado fora do caminho crítico (`components/lazy-shell.tsx`).
  Próximo passo possível: subconjunto menor da Archivo (só os glifos usados) ou instância estática na largura usada.
- **Spell UI:** registry `https://spell.sh/r/{nome}.json` (blur-reveal, words-stagger, highlighted-text, tilt-card,
  signature), instalados pelo shadcn CLI e movidos para `components/ui/` (o CLI os põe em `components/`). O CLI chama
  `pnpm` direto: sem pnpm no PATH, criar um atalho `pnpm.cmd` com `corepack pnpm %*`. Já vêm com `motion/react`.
  O Signature voltou em feat/ajustes (ver "Páginas dos pilotos").

## Decisões já tomadas

- TechText: descartado por ora. KineticText: só no título "Luzes apagadas." (ver Estado atual).
- Tipografia definida (ver Estado atual). Os `@import` mortos de Inter e Playfair e a Inter local foram removidos.
- **Licenciamento pendente:** as fotos em `public/images/editorial` são placeholders e precisam de
  licenciamento antes do lançamento comercial (antes da venda). Em uso: `abraco-redbull-ferrari` ("Mais que
  uma corrida", #story), `senna-pneus` ("Cada detalhe importa") e `verstappen-capacete` ("Luzes apagadas",
  #journal). `senna-sentado` e `senna-champanhe` estão no artigo do Senna no Diário (fase 6). Dados em `lib/editorial.ts`, com direção de arte por breakpoint:
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

### Rotas da loja

- `app/(loja)/` (layout com `SiteHeader` sólido + `SiteFooter`): `/produtos` (filtros na URL: `categoria`, `equipe`,
  `piloto`, `preco` = faixas de `lib/catalog/filters.ts`, `ordem`), `/produtos/[slug]` (galeria, tamanhos, JSON-LD
  Product), `/equipes/[slug]`, `/pilotos/[slug]`, `/categorias/[slug]`. Páginas de detalhe com `generateStaticParams`.
  `loading.tsx` com esqueletos (`components/skeletons.tsx`), 404 em `app/not-found.tsx`.
- Componentes: `ProductCard`/`ProductGrid` (card usado também na home), `TeamCard` (home), `TeamRow` (lista
  editorial), `Breadcrumbs`, `PageIntro`. Links do cabeçalho/rodapé em `lib/navigation.ts`; URL do site em `lib/site.ts`.
- O cabeçalho é `components/site-header.tsx` (overlay na home, sólido nas internas); o rodapé virou `components/site-footer.tsx` (mesmo visual).
  `CartProvider` subiu para `app/layout.tsx` (a sacola vale em todas as páginas).

### Sacola (fase 4)

- Lógica pura em `lib/cart/reducer.ts` (um item por SKU; quantidade sempre entre 1 e o estoque da variante;
  `sanitizeItems` valida o que vem do localStorage). Constantes em `lib/cart/config.ts`
  (`FREE_SHIPPING_THRESHOLD_CENTS` = R$ 299,00, chave `apex:sacola:v1`).
- `components/cart.tsx`: `CartProvider` (context + reducer, persiste no localStorage com try/catch, lê só depois de
  montar para não dar hydration mismatch, sincroniza entre abas), `CartButton` (abre a gaveta), `AddToCartButton`
  (compra rápida), `useCart`. Gaveta em `components/cart-drawer.tsx` (diálogo modal: foco preso, Esc, clique fora,
  foco volta ao botão); conteúdo compartilhado com `/carrinho` em `components/cart-contents.tsx`.
- Testes: `corepack pnpm test` (vitest; `lib/**/*.test.ts`, sem DOM).

### Checkout (fase 5) — pedidos SIMULADOS

- `/checkout` (`components/checkout/checkout-form.tsx`): etapas Contato (nome, e-mail e telefone; **sem CPF**), Endereço (CEP com máscara e busca no ViaCEP pelo cliente, com timeout de 6 s; falha ou CEP
  inexistente → preenchimento manual), Entrega (cotação no servidor por `lib/shipping/`, ver "Frete" na seção Refino 2) e Pagamento (Pix, cartão, boleto) com aceite obrigatório dos Termos e da Política.
  **CPF só no boleto** (boleto registrado exige o CPF do pagador): o campo aparece na etapa de pagamento ao escolher
  Boleto, com máscara e dígitos verificadores; Pix e cartão não pedem. Regra em `CPF_REQUIRED_METHODS`
  (`lib/checkout/schema.ts`), validada no cliente e no servidor (testes em `lib/checkout/schema.test.ts` e no e2e). Se o
  provedor real exigir CPF em outro meio (antifraude), basta incluir o meio na lista (ver `lib/payments/types.ts`).
- Validação com zod (`lib/checkout/schema.ts`) por etapa no cliente e do pedido inteiro no servidor, na server action
  `app/(loja)/checkout/actions.ts` (`placeOrder`), que **recalcula preço, estoque, frete e total pelo catálogo** (não
  confia no cliente). Máscaras/validadores em `lib/validators/br.ts` (com testes).
- **Sem persistência:** o pedido montado pelo servidor volta ao cliente, que o guarda no `sessionStorage`
  (`apex:pedido:<id>`) e abre `/pedido/[id]`. Em outra aba/dispositivo a página mostra só o número. Para valer de
  verdade: gravar o pedido (ex.: tabela `orders` + `order_lines` no Supabase) dentro da action, baixar estoque numa
  transação e ler `/pedido/[id]` do banco (com verificação de dono do pedido).
- O campo de cartão **não existe** de propósito: os dados do cartão devem ser coletados pelo componente do provedor
  (PCI). Nada de número de cartão passa pelo nosso servidor.
- **Cartão decorativo (polimento, fase 8):** ao escolher "Cartão", aparece `components/checkout/decorative-card.tsx` (TiltCard
  no desktop) com a marca da loja e o nome do titular vindo do passo de contato. **Ele NUNCA exibe nem recebe número,
  validade ou CVV digitados no nosso formulário**: esses dados só existem no componente do provedor. Está pronto para
  mostrar bandeira e últimos 4 dígitos quando o provedor os informar (`CardDisplay` em `lib/payments/types.ts`); no
  modo simulado, `•••• •••• •••• ••••`.

### Pagamento (lib/payments) — o que falta para integrar

- Interface `PaymentProvider` (`lib/payments/types.ts`); a action só usa `getPaymentProvider()` (`lib/payments/index.ts`).
  Hoje: `SimulatedPaymentProvider` (cartão aprovado na hora; Pix/boleto pendentes com instruções fictícias).
- **Mercado Pago:** criar conta e aplicação; chaves `MP_ACCESS_TOKEN` (servidor) e `NEXT_PUBLIC_MP_PUBLIC_KEY`; instalar o
  SDK (`mercadopago`); implementar `lib/payments/mercado-pago.ts` (Pix: `payment.create` com `payment_method_id: "pix"`
  → QR Code; boleto: `bolbradesco`; cartão: Card Payment Brick no cliente gera o token e o servidor cria o pagamento);
  rota de webhook (`app/api/webhooks/mercado-pago/route.ts`) validando a assinatura para mudar o pedido de "aguardando"
  para "pago"; pedidos persistidos (ver acima).
- **Stripe:** conta com Brasil habilitado; `STRIPE_SECRET_KEY` e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; SDK `stripe` e
  `@stripe/stripe-js`; `lib/payments/stripe.ts` criando PaymentIntent (cartão; Pix e boleto via `payment_method_types`)
  e Payment Element no cliente; webhook `payment_intent.succeeded` com `STRIPE_WEBHOOK_SECRET`.
- Em ambos: escolher o provedor por `PAYMENT_PROVIDER`, nunca expor chave secreta ao cliente, idempotência por
  `orderId`, e testar com as chaves de teste antes das de produção.

### Páginas legais e institucionais (fase 6) — ESQUELETO

- `/politica-de-privacidade`, `/termos-de-uso`, `/trocas-e-devolucoes`, `/envio`, `/contato`, `/faq` e `/sobre`: só
  títulos e seções (`lib/institutional.ts`, visual em `components/institutional-page.tsx`). **Todo o texto é
  "[CONTEÚDO A SER REDIGIDO]"**: o conteúdo jurídico é escrito pelo responsável, não pelo assistente.
- Rodapé com a identificação do fornecedor (Decreto 7.962/2013) em `lib/company.ts`: **todos os campos opcionais**
  (razão social, CNPJ/CPF, endereço, e-mail, telefone, horário); rodapé, /sobre e /contato mostram só os preenchidos
  (`companyFacts()`), sem placeholder ao público (refino 2, item 4). Hoje: só o nome da loja; o e-mail de contato vem de
  `NEXT_PUBLIC_CONTACT_EMAIL` (vazio até o responsável informar). **Antes de vender, o decreto exige nome empresarial,
  CNPJ/CPF e endereço.** Links para a Política e os Termos.

### SEO e qualidade (fase 7)

- `metadata` por página (título com template "%s | Apex", descrição, canonical), `metadataBase` = `SITE_URL`
  (`lib/site.ts`, sobrescrevível por `NEXT_PUBLIC_SITE_URL`), Open Graph básico (imagem do hero por padrão; produto e
  piloto usam a própria foto), `app/sitemap.ts` (home, catálogo, categorias, equipes, pilotos, produtos e páginas
  institucionais) e `app/robots.ts` (fora do índice: `/carrinho`, `/checkout`, `/pedido/`).
- E2E: `corepack pnpm test:e2e` (Playwright, `e2e/compra.spec.ts`: home → equipe → produto → tamanho → sacola →
  checkout → confirmação, em desktop e celular; ViaCEP simulado no teste). Usa o **Edge instalado** (`channel: "msedge"`),
  sem baixar navegadores; sobe o dev server se não houver um em :3000.
- Lighthouse mobile (build de produção local, mediana de 3, 14/10/2026): home Performance 89, Acessibilidade 100, Boas
  práticas 96, SEO 100; página de produto 94 / 100 / 96 / 100. Boas práticas 96 = 404 de `/_vercel/insights` (só local).
- Contraste: cinzas de texto nas páginas novas no mínimo `text-black/60` (`/40`–`/55` reprovavam sobre `#f5f5f3`).

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
  a interface. Slugs dos pilotos seguem os de `lib/drivers.ts` (`/pilotos/norris` etc.). O "Classic Racing Hoodie"
  ganhou preço "de" (R$ 459,90) para exercitar o "de/por" na home.
- **Compra rápida no card (fase 3):** produto de tamanho único entra direto na sacola; produto com tamanhos mostra
  "Escolher tamanho" e leva à página do produto (adicionar sem tamanho não faz sentido).
- **Links (fase 3):** "Coleção" (cabeçalho), "Ver todos os produtos" e "Comprar a coleção" levam a `/produtos`; o
  "Ver coleção" do hero continua rolando até a seção de categorias. Cards de pilotos → `/pilotos/[slug]`, categorias →
  `/categorias/[slug]`. Rodapé: categorias e "Novidades" (`/produtos?ordem=novidades`); Equipes e Pilotos → âncoras
  da home (não há página-índice).
- **Cabeçalho das páginas internas:** versão sólida (fundo branco) do cabeçalho da home.
- **Menu mobile (polimento, fase 0):** painel em tela cheia que entra pela direita (`components/mobile-menu.tsx`),
  aberto pelo botão do cabeçalho (home e internas). Estado global em `components/site-ui.tsx` (menu e busca, um por
  vez); comportamento modal reaproveitável em `components/use-modal.ts`. Links em `lib/navigation.ts` (`menuLinks`).
- **Índices (polimento, fase 0):** `/equipes` (mesma grade da home) e `/pilotos` (mesmos cards da home, via
  `DriverCardList` exportado de `drivers-section.tsx`). Rodapé e breadcrumbs agora apontam para eles.
- **Tipografia (fase 1):** pesos/largura/tracking dos títulos ajustados a olho (116% de largura no desktop). O itálico
  "pilotos" do hero passa a ser Archivo itálica; "Feita para" e o logo continuam na serifa itálica do sistema (não havia
  pedido para trocar o acento). Títulos pequenos de interface (sacola, checkout, "Descrição") ficam na Geist (`.font-ui`).
- **Movimento (fase 2):** o terceiro HighlightedText ficou em "grid" ("O que o grid veste"). "Mais que uma corrida." usa
  BlurReveal direto (título em duas linhas com a segunda em itálico). As entradas escalonadas valem para todas as grades
  de produto (via `ProductGrid`), categorias, equipes e pilotos. fps medido no build de produção, Edge headless sem
  limite de quadros: scroll da home ~94 fps (p95 24 ms), hover nos cards ~114 fps. (Com a bateria baixa o navegador
  trava em 30 fps até em about:blank; medir na tomada.)
- **Fase 6:** no toque, o coração do card fica sempre visível (no desktop aparece no hover). A segunda foto do card
  carrega junto (lazy, só quando o card entra na tela). Pôsteres ganharam uma 2ª imagem placeholder.
- **Desempenho (fase 11):** para recuperar parte do Lighthouse, as duas fontes ficaram sem preload, a itálica da
  Archivo saiu (o "pilotos" do hero usa itálico sintético) e busca/menu/dock carregam fora do JS inicial. A busca abre
  sem animação de entrada na primeira vez (o módulo chega já aberto).
- **HighlightedText:** a palavra herda a cor do título em vez de branco fixo (antes da barra entrar ela ficava branca
  sobre branco). Sobre o laranja: 4,3:1 com preto e 4,9:1 com branco (texto grande, mínimo 3:1).
- **Card de produto no celular:** preço abaixo do nome (lado a lado só a partir de 640px); a 360px o nome quebrava em 3.
- **Sacola (fase 4):** o aviso "adicionado à sacola" também informa quando o estoque limita a quantidade. O preço
  guardado no item é o do momento da adição; o checkout recalcula tudo no servidor. Frete grátis a partir de
  R$ 299,00 (valor de exemplo; ajustar em `lib/cart/config.ts`).
- **Checkout (fase 5):** duas opções de entrega simuladas (Econômica R$ 24,90, 7–10 dias úteis, grátis acima de
  R$ 299; Expressa R$ 49,90, 2–4 dias úteis). Parcelamento "3x sem juros" na página de produto é só texto. Sem
  campo de cartão (fica para o provedor). O pedido confirmado esvazia a sacola.
- **Esquema de cores claro nas páginas da loja:** o `globals.css` troca `color-scheme` para escuro no modo escuro do
  sistema, o que deixava selects, rádios e checkboxes nativos escuros. O layout `app/(loja)` força
  `[color-scheme:light]` (o site não tem modo escuro).
- **Rodapé (fase 6):** "Trocas" virou "Trocas e devoluções"; "Guia de tamanhos" aponta para o FAQ (não há página
  própria ainda). Circuitos e Cultura F1 continuam apontando para seções da home.
- **Testes e2e (fase 7):** Playwright instalado só como pacote (`@playwright/test`, ~14 MB), rodando no Edge do
  sistema, para não baixar navegadores. Os botões de compra rápida ganharam nome próprio ("Adicionar X à sacola").
- **Cabeçalho da equipe:** bloco `rounded-2xl` na cor da equipe que entra da esquerda (clip-path) ao abrir a
  página; a lista "Outras equipes" usa a linha editorial com o wipe no hover.

## Decisões da rodada 2

Rodada de refinamento (branch `feat/polimento-2`, criada a partir da `feat/polimento`), para revisão.

- **Destaque laranja (fase 1):** substituí o HighlightedText da Spell UI por `components/motion/highlight-word.tsx` (usado
  só pelo `SectionTitle`, prop `highlight`). A palavra grifada agora é **branca** sobre a barra. Para nunca haver branco
  sobre branco, a barra e a palavra branca formam uma camada só que entra de baixo para cima por cima da palavra na cor
  do título (duas translações sincronizadas; só `transform`). Com `prefers-reduced-motion`, aparece pronta. Contraste do
  branco sobre `#b94f01`: **4,9:1** (mínimo de texto grande 3:1; passa até o 4,5:1 de texto normal), então o tom não
  precisou mudar. O `components/ui/highlighted-text.tsx` (Spell UI) ficou instalado, mas sem uso.
- **Assinatura (fase 2), diagnóstico:** a intenção original era o Signature da Spell UI com a fonte do demo
  (`/LastoriaBoldRegular.otf`), que nunca veio no pacote; na rodada anterior ela virou a Allura. Os cortes tinham duas
  causas: (1) o SVG tinha altura fixa de 100 com `fontSize` 88 e linha de base em 94, sem espaço para descendentes, laços
  e maiúsculas altas, e a largura vinha só do avanço das letras (cortava o laço final); (2) o opentype.js 2.0 gera
  coordenadas inválidas (NaN) para várias letras dessas fontes (na Allura: "L", "N", "G"), que sumiam ou viravam
  manchas, e os espaços apareciam como pontos.
- **Assinatura, solução:** `components/driver-signature.tsx` mostra o nome como TEXTO na **Great Vibes** (SIL OFL,
  `next/font`, sem preload), revelado da esquerda para a direita por uma cortina na cor do fundo com borda em degradê
  (só `transform`, 1,5 s, curva in-out, uma vez ao entrar na tela; com reduced motion aparece pronto). Folga de 0,35em
  em volta e tamanho pela largura do título (`cqw`), sem cortes nos 4 nomes e nas 5 larguras. Candidatas comparadas
  (renderizadas no navegador): Allura, Mrs Saint Delafield, Monsieur La Doulaise, Herr Von Muellerhoff, Ballet, Great
  Vibes e Alex Brush (`docs/tipografia/assinatura-candidatas.jpg`). Great Vibes tem o traço mais fluido e legível, com
  "N", "V", "H", "B" e "G" bem resolvidos. Removidos o Signature da Spell UI, o opentype.js (~170 KB de JS a menos na
  página do piloto) e a Allura. Continua valendo: efeito tipográfico genérico, nunca o autógrafo real.
- **Animações (fase 3):** tokens em `lib/motion.ts` e `globals.css` reduzidos a 3 durações (curta 0,2 s, média 0,45 s,
  longa 0,8 s), 2 curvas (out e in-out) e stagger de 50 ms com teto de 8 itens. Títulos e parágrafos de destaque
  entram por palavra (`components/motion/reveal-text.tsx` e `section-title.tsx`, só opacity/transform) no lugar do
  BlurReveal/WordsStagger (blur caro, texto ilegível por ~0,8 s, invisível até o JS); o que já está na tela ao carregar
  aparece pronto. Cabeçalho anima só uma camada de fundo por opacidade; hover dos cards de equipe por opacidade; faixa
  do cabeçalho da equipe por transform (antes clip-path); View Transitions com duração média e curva out. Busca e menu
  pré-carregados no ocioso (e no hover/foco do ícone) e montados fechados: a primeira abertura anima. Com reduced
  motion, as entradas ficam só com opacidade (sem deslocamento).
- **Animações, medido no build de produção:** scroll da home 60 fps (desktop e celular), hover dos cards 60 fps, 0
  quadros longos (antes, 6). Títulos legíveis em ~0,44 s e completos em ~0,73 s, sem desfoque. A busca é pré-carregada e
  montada fechada; a primeira abertura anima (opacidade 0 → 1 em ~0,3 s).
- **Itálica de acento (fase 4):** **Playfair Display Italic** (só o itálico 400, latin, `next/font`, sem preload, fallback com
  size-adjust), via `--font-accent` nas classes `.font-playfair`/`.font-accent` (peso fixo 400, `font-synthesis: none`).
  Aplicada no logo, "Feita para", **"pilotos" do hero (que deixa de ser itálico sintético da Archivo)**, "Um jeito de
  viver.", primeiro nome nos cards de piloto e cartão decorativo. Candidatas comparadas: Instrument Serif, Playfair
  Display, Fraunces e Newsreader (`docs/tipografia/italica/` e `docs/tipografia/rodada-2/`). Playfair é a fonte que o design
  original pedia (a classe sempre foi `font-playfair`, mas a fonte nunca carregava) e a mais próxima da serifa itálica
  elegante do primeiro hero; Instrument Serif é estreita demais, Fraunces tem pouco contraste e Newsreader é "de livro".
  "Um jeito de viver." passa de negrito sintético (serifa do sistema em 600) para o itálico 400 real.
- **Desempenho (fase 5):** Archivo e Geist passaram a ser arquivos locais ENXUTOS (`app/fonts/`, gerados por
  `scripts/fonts/subset.cjs` com o `subset-font`/HarfBuzz, fora do projeto): só glifos do português + sinais usados e só a
  faixa de eixos usada (Archivo largura 106–125 e peso 300–900: 88 KB → 46 KB; Geist peso 400–700: 29 KB → 18 KB). Nenhuma
  mudança visual. Caractere novo fora da lista cai no fallback: acrescentar em `EXTRA` e gerar de novo. Lighthouse mobile
  (build de produção, 3 execuções, mesma máquina): home 82/83/92 → **90**/95/82 (mediana 90); produto 98/83/82 →
  86/**99**/99 (mediana 99). A simulação do Lighthouse oscila entre dois modos (FCP ~1,0 s ou ~1,7–2,0 s) sem mudança no
  observado (~0,2 s); por isso vale olhar a mediana. Acessibilidade 100, Boas práticas 96 (404 local do
  `/_vercel/insights`), SEO 100. Fixar a largura da Archivo (ex.: 112%) daria 27 KB, mas mudaria o desenho: não aplicado.
- **Refinamento (fase 6):** 18 melhorias listadas em `docs/proximos-passos.md` (prints em `docs/refino/`); aplicadas as
  5 de maior impacto e menor risco: gradiente inferior no hero **acima do spotlight** (a camada do spotlight é z-30 e, sem
  máscara antes do primeiro movimento do mouse, cobre tudo abaixo, inclusive o gradiente original z-20); campo da busca
  com 16px no celular (placeholder não corta; sem zoom do iOS); categorias na busca vazia; "Ver a coleção" dos estados
  vazios com 44px de alvo; "Filtrar no catálogo" com seta. Não mexi em paleta, estrutura, textos de CTA nem na pílula
  "VER COLEÇÃO" das equipes. Os alertas da varredura em "Luzes apagadas." e "Lewis Hamilton" são falsos positivos
  (conferidos por medição e print).
- **Medição final (15/10/2026, build de produção, 6 execuções cada):** home 85/92/84/88/83/93 (mediana ~87; 92–93 no
  modo rápido da simulação, 83–88 no lento), produto 92/92/85/84/92/96 (mediana 92). Acessibilidade 100, Boas práticas 96,
  SEO 100, CLS 0 em todas. **A meta de 90 na home não ficou garantida:** depende do modo da simulação (FCP 1,0 s ou
  1,7 s, sem mudança no observado). Próximo passo provável: reduzir a imagem do hero/LCP no celular (ver
  `docs/proximos-passos.md`). Nada visível foi cortado para ganhar pontos.

## Melhorias aprovadas (feat/pilotos)

- **Barra fixa de compra (celular):** só aparece depois que o botão principal SAI POR CIMA da tela. O
  IntersectionObserver usa `rootMargin` de 100000px embaixo: o botão conta como "dentro" na tela e abaixo dela, então o
  estado só muda ao cruzar a borda de cima (com a área normal, um salto direto para o topo deixava a barra presa).
- **Tamanho esgotado:** tamanho riscado + "ESGOTADO" visível (9px, `black/60`), além do texto para leitor de tela.
- **"Mais desejados"** (`components/most-wanted.tsx`, server): 4 primeiras peças do carrossel da home, abaixo da sacola
  vazia (/carrinho) e dos favoritos vazios; os componentes de cliente recebem pronto pela prop `empty`.
- **Produto em telas grandes (xl):** preço 36px, parcelamento 14px, tamanhos 56px de altura, botões 56px.
- **Rodapé no celular:** grupos de links em acordeão (`components/footer-column.tsx`, botão com `aria-expanded`; os
  links ficam no HTML); dados da empresa e links legais sempre visíveis. A partir de 640px, como antes.
- **Busca → "Ver todos os resultados":** leva a `/produtos?q=termo`. A listagem ganhou o filtro `q` (mesma regra da
  busca, em `SeedCatalogRepository`; chip "Busca: “termo”" removível; mantido ao trocar os outros filtros).
- **404 no celular:** o "404" vazado fica centrado atrás do título.
- **Faixa de equipes:** Mercedes 36 → 44px e Cadillac 45 → 56px de altura óptica (`lib/f1-teams.ts`).
- **Grade de equipes no celular:** com quantidade ímpar, o último card (Cadillac) ocupa a linha inteira, mais baixo
  (proporção 2,6; prop `wideOnMobile` do `TeamCard`).
- **VELOCIDADE:** o seletor "Escolha uma letra" (telas de toque) fica escondido por CSS externo (`.velocidade-portal`
  no globals.css), sem mexer no GlyphPortal; a letra de entrada é a que ele escolhe sozinho.
- **Varredura de layout no projeto:** `corepack pnpm qa:varredura` (`scripts/qa/varredura.mjs`, Playwright + Edge):
  scroll horizontal, elementos que vazam, títulos cortados (só o que aparece: ignora sr-only, display:none e painéis
  `inert`; mede SVGs como a assinatura) e erros de console. Por padrão, contra :3001 nas 5 larguras.
- Prints de cada item em `docs/pilotos/`.

## Notas técnicas

- Gerenciador: pnpm (versão em `packageManager` do `package.json`; usar via `corepack pnpm` se o `pnpm`
  não estiver no PATH). Dev: `corepack pnpm dev`. Build: `corepack pnpm build` (gera antes os placeholders
  desfocados). Seed do Supabase: `pnpm supabase:seed`.
- Lint: `corepack pnpm lint` (ESLint 9 + `eslint-config-next`, config padrão em `eslint.config.mjs`; o ESLint
  10 ainda não é suportado pelos plugins do Next). Rodar também `npx tsc --noEmit`, porque o build ignora erros
  de tipo. Testes: `corepack pnpm test` (vitest) e `corepack pnpm test:e2e` (Playwright). Avisos conhecidos (intencionais): `<img>` em `LogoItem` (logos pequenas, monocromáticas) e `pin` sem uso no
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
- **Imagens do hero (feat/ajustes):** eram dois PNGs do Vercel Blob em `background-image` (2,2 MB + 2,4 MB em qualquer
  tela). Agora são `next/image` (`fill` + `object-cover`, o mesmo enquadramento de `bg-cover bg-center`) em AVIF/WebP q90,
  com `sizes` que considera o recorte da foto 3:2 na altura da tela (`HERO_SIZES` em `lib/hero.ts`: 150vh em telas mais
  estreitas que 3:2, senão 100vw). Resolução cheia: ~93 + ~108 KB (−96%); celular de DPR 1: ~65 + ~75 KB. A foto visível
  no carregamento (camada do spotlight) vem no HTML, sem preload; a de baixo (só aparece quando a máscara entra) é montada
  no ocioso depois do `load` ou no primeiro `mousemove`. Comparação pixel a pixel com a versão antiga: igual (diferença
  média de 2–3 em 255, só compressão). As constantes ficam em `lib/` porque `spotlight.tsx` é `'use client'` (constante
  importada de módulo client num server component vira referência de cliente).
- **Lighthouse mobile da home (feat/ajustes, build final, 5 execuções):** 86/81/90/83/83, mediana 83 (fim da rodada 2:
  ~87). Acessibilidade 100, Boas práticas 96, SEO 100, CLS 0. Os bytes
  antes do primeiro quadro caíram de 5,4 MB para ~0,8 MB, mas o simulador pesa as FONTES nesse trecho, e a Inter do hero
  (item 2 dos ajustes, tipografia original) entrou com +34 KB (subconjunto enxuto; eram 48 KB). Sem a Inter, o modo lento
  da simulação volta ao FCP de ~1,66 s.
- **Fonte do hero depois do primeiro quadro (feat/pilotos, aprovado pelo dono):** o hero começa em "fontHero Fallback"
  (Arial com as métricas da Inter, do next/font) e um script inline (`HERO_FONT_SCRIPT` em `lib/hero.ts`) injeta no
  `<head>` um `<style>` com `:root{--hero-font:var(--font-hero)}` quando sai o `first-contentful-paint`
  (PerformanceObserver; limite de 3 s); em navegação interna o `Spotlight` faz isso depois da hidratação. **Não usar
  atributo do `<html>`** (`style` ou `className`): o React 19 compara os dois na hidratação e acusa divergência; tags
  inseridas no `<head>` por script são ignoradas por ele. CLS 0.
  Lighthouse mobile da home, mesmas condições e mesma hora (5 execuções): antes 81/83/84/89/84 (mediana 84, FCP ~1,96 s)
  → depois 86/91/88/85/96 (**mediana 88**, FCP ~1,06 s). **Medição:** desligue o dev server e use um Edge headless recém-
  aberto; com o dev server recompilando, o mesmo build caiu para ~72 (TBT ~900 ms). Build final da feat/pilotos (com o
  `<style>` no head e as melhorias do item 4): 85/94/84/85/95, mediana 85; a simulação alterna entre dois modos (LCP
  ~2,9 s ou ~4,3 s), então séries de 5 variam ±3 pontos. Acessibilidade 100, Boas práticas 96, SEO 100, CLS 0.

## Roteiro (próximos passos, em ordem)

1. **Revisar e aprovar** `feat/conteudo` e `feat/backend` (prévias da Vercel).
2. **Ativar Supabase e Mercado Pago em Preview** (guias em `docs/backend/`) e fazer o roteiro de testes.
3. **Fotos dos carros** e recorte.
4. **Licenciamento antes da venda:** fotos editoriais (originais ≥ 2880px de largura), fotos dos pilotos, das
   equipes, dos produtos e dos carros.

## Branches (atualizado em 22/10/2026)

- **`main`** = tudo o que foi aprovado até a `feat/pilotos` (merge fast-forward em 22/10/2026, `4dd82e2`). As branches
  antigas (`perf/server-components`, `feat/loja`, `feat/polimento`, `feat/polimento-2`, `feat/ajustes`, `feat/pilotos`)
  estão contidas na `main`.
- **`feat/conteudo`** (a partir da `main`): fases 1 a 8 da rodada de conteúdo (imagens, carros, VELOCIDADE, textos,
  Diário, descrições, /sobre). **`feat/backend`** (a partir da `feat/conteudo`): fases 9 a 11 (Supabase, Mercado Pago,
  admin). Nenhuma das duas tem merge na `main` sem aprovação.

## Rodada de conteúdo e backend (feat/conteudo, feat/backend)

### Decisões tomadas sem consulta

- **Fase 0, cards de equipe:** a logo passou a ficar numa área acima da pílula "VER COLEÇÃO" (`top: 8%`, base 38px
  acima do fundo no celular e 43px a partir de 640px) e nunca passa dela (`max-h-full`). Logos de uma linha ficam do
  mesmo tamanho (sobem ~8px no desktop); as de várias linhas encolhem quando o card é baixo. Prints em `docs/fase-0/`.
- **`agentRules: false` no `next.config.mjs`:** o `next dev` do Next 16.3 acrescentava um bloco em inglês ao fim deste
  arquivo a cada início.
- **Testes sem Edge:** `PW_EXECUTABLE_PATH=/caminho/do/chromium` faz o Playwright (e2e e `qa:varredura`) usar esse
  Chromium no lugar do Edge (sessão em nuvem Linux: `/opt/pw-browsers/chromium`). Sem a variável, continua o Edge.
- **Fase 1:** o desfoque (`filter`) na entrada da foto de piloto é exceção à regra "só transform/opacity" de
  `lib/motion.ts`, pedida explicitamente; dura ~1 s, numa foto por vez. Fotos de produto (remotas) ficam sem placeholder
  desfocado, só com o fade; o `ProductCard` também roda no cliente (favoritos), então não lê o mapa de placeholders.
  Categorias da home também ganharam o fade (imagens grandes que pipocavam). `sharp` entrou como devDependency (o
  gerador usa; o Next já o usava como opcional).
- **Fase 2:** carro e miniaturas entram 1,9 s / 2,1 s depois do sinal da foto (a assinatura termina em ~3 s): "depois da
  assinatura" lido como "quando o nome já está quase todo escrito", para não esperar 3 s por links de produto. Rótulo
  das miniaturas: "Destaques {sobrenome}". Miniaturas em cartões brancos (contraste garantido sobre qualquer cor de
  equipe). Sem fotos de carro no repositório, nenhum recorte foi feito (ver Estado).
- **Fase 11:** admin com link mágico (sem senha para guardar); só cartão de crédito no Brick. Remover foto do produto não
  apaga o arquivo do Storage. "Tamanhos sem estoque" no início do painel conta variantes com estoque 0.
- **Fase 10:** HTTP direto na API do Mercado Pago (fetch) em vez do SDK Node `mercadopago` (menos dependência; o
  contrato usado é pequeno). Só cartão de CRÉDITO no Brick (débito e carteira Mercado Pago desligados: os rótulos da
  loja são Pix, cartão de crédito e boleto). Webhook com tolerância de 15 min no `ts` e `data.id` em minúsculas no
  manifesto (ids de pagamento são numéricos). Sem `notification_url` quando o site não é https (localhost).
- **Fase 9:** catálogo do Supabase carregado inteiro com cache curto (é pequeno) em vez de uma consulta por filtro:
  reaproveita exatamente a mesma busca/ordem do seed. Fotos de página e carro dos pilotos continuam no código
  (`lib/drivers.ts`); o banco guarda nome, equipe, número e frase. O código legível do seed (APX-001) vira
  `products.code` (o `id` é uuid). Painel admin via link mágico do Supabase Auth (sem senha). O preço de cada item do
  pedido vem do banco dentro da `create_order`; o frete vem do servidor (mesma regra de `lib/checkout/shipping.ts`).
  `server-only` nos módulos com service role. A extensão pgcrypto não é necessária (gen_random_uuid é nativo).
- **Fase 6:** o dock não tem item "Diário" (5 ícones aprovados); o link fica no menu que o dock abre. Datas dos artigos:
  22, 20 e 18/10/2026. Fotos dos artigos reaproveitam as do site (Bortoleto: fotos da página do piloto; dia de prova:
  Verstappen e o abraço Red Bull/Ferrari). Autor no JSON-LD: a própria marca (organização).
- **Fase 4:** BlurReveal e WordsStagger (Spell UI) voltaram, como pedido, mas SÓ abaixo da dobra e com `inView`: eles
  escondem o texto até o JS (a rodada 2 os tirou da home por isso). Os números ficam em `<dl>` com `dt` antes dos `dd`
  (o número aparece primeiro por `order`). Fatos com divergência entre fontes ficaram de fora ou genéricos (idade de
  Hamilton ao entrar na McLaren; Bortoleto nasceu em "São Paulo" segundo a F1 e em Osasco segundo a Wikipedia).
  Números do carro: Norris 4 (correu com o 1 em 2026), Verstappen 3 em 2026.
- **Branches antigas no GitHub:** apagadas localmente; a exclusão remota foi bloqueada pela política do ambiente em
  nuvem (HTTP 403 no push de exclusão). Apagar à mão: `git push origin --delete perf/server-components feat/loja
  feat/polimento feat/polimento-2 feat/ajustes feat/pilotos`.

### Estado (rodada de conteúdo)

- **Fase 1, entrada das imagens:** placeholders desfocados gerados no build (`scripts/images/blur-placeholders.mjs`,
  roda antes do `next build` no script `build`; à mão: `pnpm images:blur`) em `lib/generated/blur-placeholders.json`
  (16px WebP + largura/altura reais de cada foto de `public/images`, exceto logos), lidos por `lib/local-images.ts`
  (`blurProps`, `localImage`, `findLocalImage`). **Não importe `lib/local-images` em componente client** (o mapa iria
  para o JS): monte no servidor e passe por prop (ex.: `lib/driver-card-blurs.ts`). `components/motion/image-reveal.tsx`
  (CSS `.img-reveal` no `globals.css`): `curtain` = cortina na cor da equipe (clip-path) + foto de 1,06× desfocada para
  1× nítida em ~1 s (token novo `duration.reveal` / `--motion-reveal`), começando no HTML do servidor (a foto nunca
  "pipoca"); `fade` = opacidade + escala 1,03 → 1 por cima do placeholder, só se a foto ainda não carregou. A animação
  só começa com `img.decode()` resolvido; failsafe de 6 s; `<noscript>` mostra a foto. Estados `pending → in → done`
  (em `done` nenhuma regra vale: o hover das fotos volta ao normal). Reduced motion: só opacidade.
  Página do piloto: principal com `preload` e cortina; dispara o sinal `piloto-foto-{slug}` (`components/motion/cue.ts`)
  e a assinatura (`DriverSignature after=...`, prop `play` no Signature, adaptação APEX 5) começa 0,45 s depois.
  Secundária: cortina ao entrar na tela. Fade: cards de piloto, editoriais da home, categorias, card e galeria de produto.
  **Versões de desktop opcionais:** `public/images/pilotos/paginas/{slug}-principal-desktop.*` e
  `{slug}-secundaria-desktop.*` (jpg/png/webp) são detectadas no build e usadas a partir de 1024px via `<picture>`
  (`ArtDirectedImage`, que ganhou `eager`); cada aparelho baixa só uma. A orientação da versão de desktop decide o layout
  do topo no desktop; enquadramento opcional em `desktopPosition` (`lib/drivers.ts`). GIF em `docs/fase-1/`.

- **Fase 2, topo do piloto:** o espaço vazio entre o caminho (breadcrumbs) e o nome mostra o **carro** se existir
  `public/images/pilotos/carros/{slug}.png` (ou `carImage` em `lib/drivers.ts`) no build; senão, **miniaturas** de 3
  produtos do piloto (`components/driver-highlights.tsx`; `featured` primeiro). Com carro, as miniaturas descem para
  uma linha logo abaixo do topo. Celular: nome → foto → carro/miniaturas. `components/driver-car.tsx`: entra deslizando
  de lado 1,9 s depois do sinal da foto (CSS `.driver-car`, propriedade `translate`, separada do `transform` da
  inclinação), sombra no chão em CSS, inclinação até 6° seguindo o mouse (perspective; só com hover + ponteiro fino e
  ≥ 768px; sem inclinação com reduced motion). `carFacing` = lado para onde o carro aponta NO ARQUIVO; a página quer
  `CAR_FACING` ("right") e espelha (`scaleX(-1)`) se precisar. Miniaturas: `CueReveal` (`components/motion/cue-reveal.tsx`,
  entrada escalonada depois de um sinal), 2,1 s depois da foto.
  **Recorte:** `scripts/carros/recortar.py` (rembg, modelo isnet-general-use; instruções no topo do arquivo) lê
  `assets/carros-brutos/` (fora do deploy), escolhe por piloto a foto de fundo mais claro e uniforme, remove o fundo,
  limpa o halo (encolhe 1px o alfa e descontamina a cor do fundo) e exporta PNG de 2000px + prévias sobre fundo claro,
  escuro e na cor da equipe em `assets/carros-brutos/previas/`. **Nenhuma foto de carro foi encontrada** em `public/` nem
  em `assets/` (nem no histórico do GitHub) em 22/10/2026: os 4 pilotos estão com as miniaturas. O pipeline foi testado
  numa foto do projeto (Verstappen, fundo claro): recorte limpo, sem halo. Prints em `docs/fase-2/` (o
  `TESTE-slot-do-carro-com-silhueta.jpg` usa uma silhueta desenhada só para conferir o layout; não está no site).
- **Fase 3, VELOCIDADE:** padrão de linhas de fluxo (túnel de vento) gerado em código (`lib/velocidade-pattern.ts`, 26
  linhas deterministas, Catmull-Rom → Bézier) num SVG dentro da camada do campo que acompanha
  `scale(var(--gp-field-scale))`; traço branco de 1px (`vector-effect`), opacidade 0,08, deriva de 32 s em
  `transform` (`.vel-pattern`), parada com reduced motion. **Vitrine editorial (refino 2, item 2):** texto à esquerda
  e 2 produtos `featured` à direita, SEM caixas brancas: um grande (foto 4:5, altura `--vel-h` = min(58svh, 520px, 33vw))
  e um menor (70%), mais baixo e sobreposto ~8% ao grande, com sombra. Cada um: foto `rounded-2xl` com zoom 1,03 no
  hover, nome forte (Archivo, branco), preço numa pílula branca `rounded-md` e "Ver produto →"; um único link por
  produto. No celular, carrossel com snap de slides grandes (78% da largura). Entrada escalonada pela revelação do portal
  (`--gp-reveal` em `.vel-card`), clicável só depois (`data-gp-entered`). Medido (altura do conteúdo): 1440×900 555px,
  1280×720 497px, 390×844 656px, 2 produtos em todos, sem scroll horizontal. Prints e GIF em `docs/refino-2/2-velocidade/`.
  `featured` (campo do `Product`): os 2 primeiros são Scuderia Racing Jacket e Classic Racing Hoodie. GlyphPortal não foi
  alterado.
- **Fase 4, textos dos pilotos:** `lib/content/drivers/{slug}.ts` (tipo em `types.ts`: abertura, trajetória 3–4
  parágrafos, estilo 1–2, 3–5 números estáveis e 3 curiosidades), fontes por fato em `docs/conteudo/fontes-pilotos.md`.
  Layout em `components/driver-story.tsx`: abertura com WordsStagger ao lado da foto secundária (no lugar de
  "[TEXTO SOBRE O PILOTO]"), depois Trajetória (coluna de ~65 caracteres), números grandes na Archivo com fio na cor da
  equipe, Estilo de pilotagem e Curiosidades lado a lado, nota "Texto editorial independente, escrito por fãs. Sem
  vínculo com..." e os produtos. Títulos com BlurReveal. **Ao atualizar:** nada de total de vitórias/pódios/pontos
  (muda a cada corrida); recordes e títulos só com fonte; sem citações do piloto; nunca sugerir loja oficial.
- **Fase 5, textos das equipes:** `lib/content/teams/{slug}.ts` (11 arquivos; tipo em `types.ts`: abertura, história em
  2 parágrafos, 3 marcos e sede), fontes em `docs/conteudo/fontes-equipes.md`. `components/team-story.tsx` entre o
  cabeçalho e os produtos de `/equipes/[slug]`: título com BlurReveal, abertura com WordsStagger, sede com marcador na cor
  da equipe, história em coluna de leitura, marcos com o ano grande na Archivo e a nota de texto independente.
- **Fase 6, Diário:** `/diario` (índice: mais recente em destaque + grade) e `/diario/[slug]` (estáticas). Artigos em
  `lib/content/diario/` (tipo `Article` em `types.ts`: título, linha fina, data, capa, corpo em blocos p/h2/imagem e
  `related` = slugs ou filtro de piloto/equipe); tempo de leitura a 200 palavras/min (`readingMinutes`). Fontes por fato
  em `docs/conteudo/fontes-diario.md`. Layout de leitura: título grande centralizado, coluna `max-w-[65ch]` a 17–18px,
  imagens do corpo um pouco mais largas que o texto (`lg:-mx-24`). **Refino 2, item 3:** `position` (object-position) de
  cada foto em `lib/content/diario` acertado para não cortar rosto nem cabeça nos 3 recortes (4:5 celular, 16:10 desktop,
  4:3 cards; as fotos são verticais, então um valor serve aos três). Parágrafos justificados a partir de 640px
  (`.article-p` no globals.css: `hyphens: auto`, `hyphenate-limit-chars: 6 3 2`, `text-wrap: pretty`; `lang="pt-BR"` no
  `<html>` e na coluna); abaixo, à esquerda. O Chromium headless da nuvem não tem dicionário de hifenização: medido sem
  ela, o maior espaço entre palavras é 0,88em a 640px e 0,74em a 1440px (média 0,37–0,42em). Prints em
  `docs/refino-2/3-diario/`. JSON-LD Article, nota de texto independente e
  produtos relacionados. Artigos: Senna e a McLaren (usa `senna-sentado` e `senna-champanhe`), O Brasil de volta ao
  grid (Bortoleto) e A cultura do dia de prova. "Diário" no cabeçalho, no menu (aberto pelo dock) e no rodapé (coluna
  Explorar) aponta para `/diario`; em "Luzes apagadas." entrou só o link "Ler o Diário →" abaixo do botão. Sitemap
  inclui o Diário. Para escrever um artigo novo: criar o arquivo, registrar em `lib/content/diario/index.ts` e listar
  as fontes.
- **Fase 7, descrições de produto:** os 66 produtos do seed têm descrição em 2 parágrafos (separados por `\n\n`) e
  ficha `details` (material, caimento/ajuste/escala, cuidados) em `lib/catalog/seed/descriptions.ts` (textos próprios
  para as 6 peças da casa; modelos por tipo para equipes e pilotos, com a tagline da equipe ou a frase do piloto).
  `detailsPending: true` faz a página mostrar "[CONFERIR COM O PRODUTO REAL]" acima da ficha: as fichas são exemplos.
  A meta description usa só o 1º parágrafo. Nenhuma descrição diz "oficial" (a camiseta de equipe dizia "Camiseta
  oficial de torcedor") e o boné de piloto não tem mais "assinatura bordada" (agora "nome bordado na lateral").
- **Refino 2, item 4, /sobre reescrita:** loja de artigos de F1 e cultura do automobilismo, independente (sem vínculo,
  patrocínio ou aprovação da F1, das equipes ou dos pilotos, em destaque no manifesto); 6 frentes (camisetas de todas as
  equipes, miniaturas de carros, pistas impressas em 3D, canecas, pilotos históricos, colecionáveis) + nota de sob
  encomenda/importado + as categorias do catálogo; entrega em todo o Brasil; prazos e trocas `[CONFIRMAR]`; contato
  só com os dados preenchidos de `lib/company.ts`. Prints em `docs/refino-2/4-sobre/`. O texto abaixo é o da fase 8.
- **Fase 8, /sobre:** página própria (`app/(loja)/sobre/page.tsx`, textos em `lib/content/sobre.ts`): manifesto, o que
  vendemos (as 4 categorias do catálogo, com a frase "Não somos uma loja oficial de nenhuma equipe ou piloto") e como
  trabalhamos (envio, trocas, atendimento, com links para as páginas de ajuda). Tudo que depende de dado real vem
  marcado `[CONFIRMAR]` e aparece destacado (`components/confirm-text.tsx`). Prazos e frete grátis vêm de
  `lib/checkout/shipping.ts` e `lib/cart/config.ts` (mudam junto). Sem texto jurídico. A entrada `sobre` de
  `lib/institutional.ts` ficou só para título, descrição e sitemap.
- **Fase 9, Supabase (pronto, desligado):** ativa com `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (catálogo)
  e `SUPABASE_SERVICE_ROLE_KEY` (pedidos); sem elas, nada muda. Passo a passo em `docs/backend/supabase.md`, variáveis
  em `.env.example`. Migração `supabase/migrations/20261022000000_loja.sql` (tabelas, RLS, `create_order`,
  `release_order_stock`, `is_admin`, bucket `produtos`); seed `supabase/seed.sql` gerado por `pnpm supabase:seed`
  (`--push` grava direto). `lib/catalog/memory-repository.ts` (filtros/busca em memória, ex-seed-repository) é a base
  de `SeedCatalogRepository` e `SupabaseCatalogRepository` (cache de 60 s; `getVariantBySku` sempre fresco).
  Mapeamento linhas ↔ tipos em `lib/catalog/supabase-mapping.ts` e `lib/orders/mapping.ts` (com testes). Pedidos em
  `lib/orders/store.ts` (service role). O checkout grava o pedido e baixa o estoque ANTES de cobrar; total cobrado =
  total do banco; recusa/erro cancela e devolve o estoque. `/pedido/[id]?t=<access_token>` lê do banco;
  `components/checkout/order-view.tsx` é a página de status (aprovado, Pix, boleto, análise, recusado, cancelado,
  enviado), usada também no modo simulado. `supabase/tests/loja.test.ts` testa a migração + seed num Postgres em
  memória (PGlite) no `pnpm test`: baixa transacional, venda acima do estoque bloqueada, devolução idempotente e RLS.
  **Não testado contra um projeto Supabase real** (sem credenciais nesta sessão).
- **Fase 10, Mercado Pago (pronto, desligado):** liga com `NEXT_PUBLIC_MP_PUBLIC_KEY` + `MP_ACCESS_TOKEN` (e
  `MP_WEBHOOK_SECRET` para o webhook); sem elas, provedor simulado. Guia em `docs/backend/mercadopago.md` (credenciais
  de teste, URL do webhook, cartões de teste, produção). Etapa de pagamento: Payment Brick oficial
  (`components/checkout/mercado-pago-brick.tsx`, `@mercadopago/sdk-react`, carregado por `next/dynamic` só quando
  ligado) com Pix, crédito até 12x e boleto; o Brick pede o CPF quando o meio exige. `MercadoPagoProvider`
  (`lib/payments/mercado-pago.ts`) cria o pagamento com o total do servidor e `X-Idempotency-Key` por pedido. Parte pura
  com testes em `lib/payments/mercado-pago-core.ts` (corpo, resposta, assinatura HMAC-SHA256 do webhook, handler
  idempotente). Webhook em `app/api/webhooks/mercadopago/route.ts` (404 se desligado; 401 assinatura inválida; busca o
  pagamento na API; `payment_events` para idempotência). Cartão recusado na hora: fica no checkout com o motivo.
  Cartão decorativo: bandeira pelo BIN (SDK) e últimos 4 dígitos devolvidos pelo Brick no envio (prop `simulated`).
  Páginas de status em `OrderView` (prints com pedidos de exemplo em `docs/fase-10/`). O modo do checkout é decidido
  no build: depois de mudar as variáveis, novo deploy. **Não testado contra o Mercado Pago real** (sem credenciais).
- **Fase 11, painel admin (pronto, desligado):** `/admin` (layout próprio, `noindex`, `X-Robots-Tag` pelo
  `proxy.ts`, `Disallow: /admin`, fora do sitemap, sem dock). Sem Supabase, todas as rotas mostram como ativar
  (`adminDisabled()` nas páginas). Login por link mágico do Supabase Auth (`/admin/entrar`, callback PKCE em
  `/admin/entrar/callback`, só para `ADMIN_EMAILS`, sem criar usuário); sessão renovada pelo `proxy.ts` (Next 16, ex-
  middleware, matcher só `/admin`). Duas travas: `ADMIN_EMAILS` (app, `lib/admin/auth.ts`) e `admin_emails` (RLS).
  Produtos: lista com busca/filtro, criar/editar (`components/admin/product-form.tsx`; validação em
  `lib/admin/product-schema.ts` com testes; preços em reais → centavos; SKU não pode ser de outro produto; publicar
  exige foto), fotos enviadas do navegador para o bucket `produtos`, arquivar. Salvar limpa o cache do catálogo e
  revalida a loja. Pedidos: lista por status, detalhe, "marcar como enviado" com rastreio (só pagos). Guia em
  `docs/backend/admin.md`. **Fluxo logado não testado contra um Supabase real** (print do formulário em
  `docs/fase-11/` foi feito com dados de exemplo).
- **Imagens de carros em public/images/pilotos/carros/ vindas de fotos de imprensa são PLACEHOLDERS: têm logos de
  patrocinadores e números de carro (alguns de outros pilotos). Antes do lançamento, substituir por carros sem logos
  nem números (arquivo com o mesmo nome) ou licenciar.**

### QA final da rodada (22/10/2026)

- tsc ok; lint 0 erros; build ok; `pnpm test` 57 testes (10 arquivos, inclui PGlite e webhook); e2e 15 passaram / 1
  pulado (desktop + celular, build de produção; novo `e2e/conteudo.spec.ts`); `pnpm qa:varredura` sem alertas em 5
  larguras × 15 rotas (lista padrão ampliada com /equipes/williams, /pilotos/bortoleto, /diario, artigo, /sobre, /admin).
- Lighthouse mobile (mediana de 3, Chromium nesta máquina): home 98, /pilotos/hamilton 87 (main antes: 86), artigo do
  Diário 89; acessibilidade 100/97/100. Detalhes em `docs/qa-final/lighthouse-mobile.md`. Relatório completo em
  `docs/relatorio-final.md`.
- Para rodar e2e e varredura sem Edge: `PW_EXECUTABLE_PATH=/caminho/do/chromium`.

## Refino 2 (feat/refino, a partir da feat/backend)

- **Modelo de venda (item 5):** campos públicos por produto em `Product` (`fulfillment` "estoque_proprio" |
  "sob_encomenda", `dispatchDays` {min, max} em dias úteis ATÉ O ENVIO, `origin` "nacional" | "importado", `package`
  peso/medidas para o frete); regras puras em `lib/catalog/fulfillment.ts` (com testes). Migração NOVA
  `supabase/migrations/20261023000000_modelo_de_venda.sql` (a anterior não foi tocada): colunas em `products`, tabela
  **`product_private`** (custo, frete do fornecedor, link do fornecedor, notas) com RLS só admin e `revoke` do anon,
  colunas por item em `order_items` (`item_status` separando | aguardando-compra | comprado | enviado | entregue,
  `supplier_tracking_code`, `tracking_code`, datas) e `create_order` recriada copiando o modelo de venda para cada item.
  **Dados privados nunca entram no `Product`, no seed local nem no JS/HTML público**: testes no PGlite
  (`supabase/tests/loja.test.ts`), em `lib/catalog/fulfillment.test.ts` e no e2e `e2e/modelo-de-venda.spec.ts`
  (procura os nomes dos campos no HTML). O rastreio do fornecedor também não vai para o cliente (`orderFromRow`).
  Seed (exemplo): camisetas, bonés e peças da casa em estoque próprio (1–2 dias úteis); moletons/jaquetas de equipe sob
  encomenda (7–12); miniaturas de capacete importadas sob encomenda (15–30); pôsteres sob encomenda (3–6).
  Página de produto: "Produto sob encomenda" (+ "Importado") e "Envio estimado em X a Y dias úteis" quando sob encomenda
  ou acima de 3 dias. Sacola e checkout (`components/dispatch-summary.tsx`): prazo do item mais lento e aviso de mais de
  um pacote quando os prazos diferem; o item da sacola guarda `fulfillment`/`dispatchDays` (itens antigos usam o
  padrão 1–3). Página do pedido: status por item (rótulos do cliente sem falar em fornecedor) depois do pagamento.
  **Sob encomenda também usa o estoque da variante**: ali ele é "quantas unidades a loja aceita encomendar".
  Prints em `docs/refino-2/5-modelo-de-venda/`.

- **Admin (item 6):** formulário do produto com "Venda e envio" (público) e "Custo e fornecedor" (privado, gravado em
  `product_private`) + `components/admin/price-calculator.tsx` (cálculo puro em `lib/admin/pricing.ts`, com testes;
  parâmetros editáveis no localStorage `apex:admin:precificacao:v1`; valores iniciais são exemplo). Fila
  `/admin/fornecedor` (itens sob encomenda de pedidos pagos; link, copiar dados do cliente via
  `lib/admin/supplier.ts`, rastreio do fornecedor, "Marcar comprado" em `app/admin/fornecedor/actions.ts`). "Marcar como
  enviado" também passa os itens para "enviado". Compra manual, sem automação. Desligado sem Supabase (como o resto do
  painel). Prints (com dados de exemplo, página temporária) em `docs/refino-2/6-admin/`. Guia em `docs/backend/admin.md`.

- **Frete (item 7):** `lib/shipping/` com a interface `ShippingProvider`: (a) simulado por região do CEP (a partir de
  MG) e peso cobrado (real × cúbico), Econômica grátis acima do limite; (b) Melhor Envio pronto e desligado
  (`MELHOR_ENVIO_TOKEN`; sandbox até `MELHOR_ENVIO_ENV=production`; falha → simulado); (c) entrega local por faixa de CEP
  (`LOCAL_DELIVERY` em `lib/shipping/config.ts`: 37950-000 a 37959-999, R$ 10, grátis a partir de R$ 150, 1–2 dias;
  tudo exemplo/[CONFIRMAR]). O checkout cota pela server action `quoteShipping` ao sair da etapa Endereço (preço,
  pacote e prazo vêm do catálogo pelo SKU) e o `placeOrder` cota DE NOVO e só aceita uma opção existente. Cada opção
  mostra "Chega em X a Y dias úteis" (envio do item mais lento + transporte; `lib/checkout/shipping.ts`). Guia em
  `docs/backend/frete.md`; prints em `docs/refino-2/7-frete/`.

## Pendências (atualizado em 22/10/2026)

- **Branches antigas no GitHub:** apagar à mão (bloqueado na sessão em nuvem): `git push origin --delete
  perf/server-components feat/loja feat/polimento feat/polimento-2 feat/ajustes feat/pilotos`.
- **Aprovação:** `feat/conteudo` (fases 1–8) e `feat/backend` (fases 9–11, contém a `feat/conteudo`) sem merge na `main`.
- **Fotos dos carros:** nenhuma no repositório; recortar com `scripts/carros/recortar.py` quando chegarem (placeholders).
- **Contraste do cabeçalho do piloto** (anterior à rodada): caminho `white/70`, link da equipe `white/80` e frase
  `white/85` sobre cores como o vermelho da Ferrari (2,9–4,0:1). Sugestão: branco sólido. Não aplicado.
- **Depende do responsável:** contas e chaves do Supabase e do Mercado Pago (lista exata em `docs/relatorio-final.md`),
  textos legais, razão social/CNPJ/endereço em `lib/company.ts`, dados [CONFIRMAR] da /sobre, fichas de produto,
  fotos licenciadas (editoriais, pilotos, produtos, carros), conferir as cores das equipes com os manuais de marca.
- E-mails transacionais não implementados; cancelamento automático de Pix/boleto vencidos depende do aviso do Mercado
  Pago (ou de uma rotina).
- Supabase, Mercado Pago e o painel logado **não foram testados contra serviços reais** (sem credenciais).
- **Fotos editoriais:** placeholders (licenciar antes da venda), inclusive as usadas no Diário.
- O 404 de `/_vercel/insights/script.js` só ocorre localmente.
