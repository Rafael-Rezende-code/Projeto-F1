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
- **Tipografia (polimento, fase 1):** tokens em `lib/fonts.ts` (next/font/google): **Archivo** variável (peso + eixo
  de largura `wdth`, normal e itálico) nos títulos (`--font-display`) e **Geist** em textos, interface e preços
  (`--font-sans`). Ajustes finos em `:root` no `globals.css`: `--display-stretch` 116% (106% abaixo de 640px, para os
  títulos grandes não encostarem nas bordas), `--display-weight` 600, `--display-tracking` -0,035em, `--display-leading`
  0,98, `--body-tracking`. A regra de `h1, h2, .font-display` fica **fora de @layer** e vence as utilities antigas dos
  títulos (`font-medium`, `tracking-[...]`, `leading-[...]`). Títulos pequenos de interface usam `.font-ui`. O acento
  em serifa itálica (`.font-playfair`: logo, "Feita para", primeiro nome dos pilotos) usa a serifa do sistema, como
  antes. Comparação com Inter Tight + Inter e Space Grotesk + Geist em `docs/tipografia/` (não aplicadas).

- **Movimento (polimento, fase 2):** tokens em `lib/motion.ts` (durações, curvas, distâncias, stagger) espelhados em
  variáveis CSS (`--motion-*`, `--ease-*`) no `globals.css` — **use esses tokens em toda animação nova**. Títulos de seção
  entram com `SectionTitle` (`components/motion/section-title.tsx`, BlurReveal da Spell UI, uma vez ao entrar na tela);
  grades de cards com `RevealGroup` (`components/motion/reveal-group.tsx`: um IntersectionObserver por grade + CSS
  `[data-reveal]`, sem JS por card; grade já visível ao carregar não anima). WordsStagger nos parágrafos de "Mais que
  uma corrida." e "Cada detalhe importa.". **HighlightedText em no máximo 3 lugares**: "corrida" (Feita em torno da
  corrida.), "detalhe" (Cada detalhe importa.) e "grid" (O que o grid veste), barra laranja #b94f01 e texto branco.
- **Cabeçalho inteligente (polimento, fase 3):** `components/site-header.tsx` (client) é o cabeçalho de todas as páginas.
  `variant="overlay"` na home: fixo e transparente sobre o hero com texto claro; ao rolar ganha fundo branco 80% com
  desfoque, borda sutil e texto escuro. `variant="solid"` nas internas: sticky, já com fundo. Esconde ao rolar para
  baixo (depois de 120px) e volta ao rolar para cima; volta ao receber foco (`focus-within` em CSS + `onFocusCapture`).
  Não esconde enquanto um painel trava a rolagem. Sem salto de layout (esconder é só `translateY`).
- **Dock no celular (polimento, fase 4):** `components/mobile-dock.tsx` com o `MagneticDock` (`components/ui/magnetic-dock.tsx`,
  código recebido; mudanças: import `motion/react`, `aria-label`/`aria-current` no botão e elevação de 4px do item ativo).
  Só abaixo de 768px, variante glass, centralizado, acima de `env(safe-area-inset-bottom)`; ícones 44px, sem tooltip,
  sem efeito magnético (`maxScale` 1). Itens: Início, Buscar (abre a busca), Equipes, Sacola (badge = quantidade; abre
  a gaveta) e Menu. Escondido em `/checkout` e `/pedido`. `--dock-space` (globals.css) é o espaço que ele ocupa: há um
  espaçador na cor do rodapé no fim da página, e o aviso da sacola, o bloco de CTA do hero e a barra fixa de compra
  ficam acima dele.
- **Spell UI:** registry `https://spell.sh/r/{nome}.json` (blur-reveal, words-stagger, highlighted-text, tilt-card,
  signature), instalados pelo shadcn CLI e movidos para `components/ui/` (o CLI os põe em `components/`). O CLI chama
  `pnpm` direto: sem pnpm no PATH, criar um atalho `pnpm.cmd` com `corepack pnpm %*`. Já vêm com `motion/react`.
  O Signature tinha a fonte fixa `/LastoriaBoldRegular.otf` (não incluída): virou a prop `fontUrl`, padrão Allura
  (SIL OFL, `public/fonts/`). Depende de `opentype.js` (só carregado onde o Signature é usado).

## Decisões já tomadas

- TechText: descartado por ora. KineticText: só no título "Luzes apagadas." (ver Estado atual).
- Tipografia definida (ver Estado atual). Os `@import` mortos de Inter e Playfair e a Inter local foram removidos.
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

- `/checkout` (`components/checkout/checkout-form.tsx`): etapas Contato (nome, e-mail, telefone, CPF com máscara e
  dígitos verificadores), Endereço (CEP com máscara e busca no ViaCEP pelo cliente, com timeout de 6 s; falha ou CEP
  inexistente → preenchimento manual), Entrega (opções simuladas em `lib/checkout/shipping.ts`; a Econômica é grátis
  acima do limite de frete grátis) e Pagamento (Pix, cartão, boleto) com aceite obrigatório dos Termos e da Política.
- Validação com zod (`lib/checkout/schema.ts`) por etapa no cliente e do pedido inteiro no servidor, na server action
  `app/(loja)/checkout/actions.ts` (`placeOrder`), que **recalcula preço, estoque, frete e total pelo catálogo** (não
  confia no cliente). Máscaras/validadores em `lib/validators/br.ts` (com testes).
- **Sem persistência:** o pedido montado pelo servidor volta ao cliente, que o guarda no `sessionStorage`
  (`apex:pedido:<id>`) e abre `/pedido/[id]`. Em outra aba/dispositivo a página mostra só o número. Para valer de
  verdade: gravar o pedido (ex.: tabela `orders` + `order_lines` no Supabase) dentro da action, baixar estoque numa
  transação e ler `/pedido/[id]` do banco (com verificação de dono do pedido).
- O campo de cartão **não existe** de propósito: os dados do cartão devem ser coletados pelo componente do provedor
  (PCI). Nada de número de cartão passa pelo nosso servidor.

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
- Rodapé com a identificação do fornecedor exigida pelo Decreto 7.962/2013 (razão social, CNPJ, endereço, e-mail e
  telefone) em `lib/company.ts` — **placeholders: preencher antes de vender** — e links para a Política e os Termos.

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

## Notas técnicas

- Gerenciador: pnpm (versão em `packageManager` do `package.json`; usar via `corepack pnpm` se o `pnpm`
  não estiver no PATH). Dev: `corepack pnpm dev`. Build: `corepack pnpm build`.
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

## Roteiro (próximos passos, em ordem)

1. **Fonte de acento:** decidir a serifa itálica (hoje a do sistema) ou trocá-la pela Archivo itálica.
2. **Refinar os cards de pilotos.**
3. **Página de produto.**
4. **Seção "Diário"**, com as fotos `senna-sentado` e `senna-champanhe`.
5. **Licenciamento antes da venda:** fotos editoriais (originais ≥ 2880px de largura), fotos dos pilotos e das
   equipes.

## Pendências (atualizado em 14/10/2026)

- **Branch `perf/server-components`:** aguardando teste na prévia da Vercel e aprovação para merge na `main`.
- **Branch `feat/loja`** (criada a partir da `perf/server-components`): loja completa (fases 1 a 7). Sem merge na
  `main`. Depende do responsável: integração de pagamento (Mercado Pago ou Stripe), banco (Supabase) para catálogo e
  pedidos, textos legais, razão social/CNPJ/endereço em `lib/company.ts`, fotos licenciadas de produtos, e conferir
  as cores das equipes com os manuais de marca.
- **Fotos editoriais:** placeholders (licenciar antes da venda); `senna-sentado` e `senna-champanhe` aguardam
  a seção "Diário".
- O 404 de `/_vercel/insights/script.js` só ocorre localmente.
