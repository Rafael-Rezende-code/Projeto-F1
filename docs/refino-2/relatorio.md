# Refino 2: relatório (22/10/2026)

Branch `feat/refino`, criada a partir da `feat/backend`. Sem merge na `main`. Prints e GIFs em `docs/refino-2/`.

## Commits

| Item | Commit | O que mudou |
| --- | --- | --- |
| 0 | `d510043` | Cabeçalho do piloto: caminho, link da equipe e frase com contraste ≥ 4,5:1 (branco ou preto pela cor da equipe; `lib/contrast.ts`). |
| 1 | `6c2347d` | Piloto: topo → produtos ("A coleção {Nome}", grade 2/3/4) → história e números → bloco editorial. Sem carro, o espaço ao lado da assinatura mostra frase, 3 números e "Ver a coleção ↓". Equipe: cabeçalho → produtos → história → outras equipes. |
| 2 | `9a1a7f2` | VELOCIDADE: vitrine editorial de 2 produtos, sem caixas brancas, sobrepostos; cabe em 100svh (1440×900, 1280×720, 390×844). |
| 3 | `9356a2a` | Diário: enquadramento por foto (rostos inteiros nos 3 recortes) e texto justificado com hifenização a partir de 640px. |
| 4 | `b6e9166` | /sobre reescrita com os fatos dados; `lib/company.ts` com campos opcionais (só o preenchido aparece; e-mail por `NEXT_PUBLIC_CONTACT_EMAIL`). |
| 5 | `9044344` | Modelo de venda: estoque próprio × sob encomenda, prazos, origem, pacote; dados privados em `product_private` (só admin); status por item; avisos no produto, sacola, checkout e pedido. |
| 6 | `64ed5b9` | Admin: campos de venda, custo e fornecedor; calculadora de preço; fila "Comprar no fornecedor". |
| 7 | `c7c0a1a` | Frete: `ShippingProvider` com simulado (região + peso), Melhor Envio (desligado) e entrega local; cotação no servidor. |
| 8 | `8e46439` | `docs/operacao/modelo-de-venda.md`; fotos de carro recebidas guardadas em `assets/carros-brutos/` (não usadas). |
| QA | este commit | Relatório, varredura com rotas novas, CLAUDE.md. |

## QA final (build de produção)

- `tsc --noEmit`: ok. Lint: 0 erros (2 avisos conhecidos e intencionais).
- `pnpm test`: **86 testes** em 16 arquivos (inclui migrações no PGlite, RLS dos dados privados, frete, calculadora).
- E2E (Playwright, desktop + celular, contra o build de produção): **21 passaram, 1 pulado** (o mesmo de antes).
- `pnpm qa:varredura`: **sem alertas** em 5 larguras × 20 rotas (lista padrão ampliada com /pilotos/norris, produto sob
  encomenda, 2º e 3º artigos e /contato).
- Lighthouse mobile (mediana de 3, Chromium desta máquina):

| Página | Performance | Acessibilidade | Boas práticas | SEO | CLS |
| --- | --- | --- | --- | --- | --- |
| Home | 96 (98/96/93) | 100 | 96 | 100 | 0 |
| /pilotos/hamilton | 85 (86/85/85) | 100 (antes 97) | 96 | 100 | 0 |
| /diario/senna-e-a-mclaren | 91 (91/91/86) | 100 | 96 | 100 | 0 |

Boas práticas 96 = 404 local do `/_vercel/insights` (só fora da Vercel). Hamilton: LCP ~4 s na simulação (foto
principal com cortina); antes desta rodada a mediana era 87, dentro da variação de ±3 da simulação.

## Decisões tomadas sem consulta

- **Item 0:** a McLaren (laranja) não atinge 4,5:1 com branco, então o texto pequeno do cabeçalho dela fica **preto**;
  nas outras 10 equipes, branco. Nada mais mudou no cabeçalho.
- **Item 1:** com 4 produtos, a grade fica 2/3/4 colunas sem o card 2×2 (o 2×2 só entra quando completa as linhas;
  com 4 itens sobrariam buracos). Os números do topo são os 3 primeiros de `lib/content/drivers`.
- **Item 2:** no celular, carrossel com snap de slides grandes (78% da largura) em vez de um embaixo do outro: cabe em
  100svh com os 2 produtos.
- **Item 3:** um único `position` por foto serve aos 3 recortes (as fotos são verticais). O Chromium da nuvem não tem
  dicionário de hifenização; medi o pior caso sem ela (maior espaço 0,88em a 640px).
- **Item 4:** o e-mail de contato não foi informado: ele vem de `NEXT_PUBLIC_CONTACT_EMAIL` (vazio = não aparece). A
  /sobre ganhou a nota "algumas peças são sob encomenda ou importadas" (decorre do item 5) e manteve as categorias.
- **Item 5:** sob encomenda **também usa o estoque** da variante (= quantas unidades a loja aceita encomendar). Status
  inicial "separando" para itens de estoque próprio (os 4 status pedidos são do sob encomenda). O rastreio do
  fornecedor nunca vai para o cliente. Avisos de prazo na página do produto só para sob encomenda ou prazo > 3 dias.
- **Item 6:** parâmetros da calculadora salvos no navegador do admin (não no banco); valores iniciais 4,99% de taxa,
  0% de impostos e 35% de margem (exemplo). Preço sugerido arredondado para ,90. "Marcar como enviado" também passa os
  itens para "enviado".
- **Item 7:** regiões do simulado contadas a partir de MG; entrega local com R$ 10, grátis a partir de R$ 150 e 1–2
  dias (exemplo). Com Melhor Envio, o frete grátis vale para a opção mais barata. "Chega em" = envio + transporte.
- **Fotos de carro:** guardadas em `assets/carros-brutos/recebidos-2026-10-22/`, sem uso (a instrução era não usar PNG
  de carro nesta rodada). Audi #27 e Red Bull #7 não são os números dos pilotos do site.

## Pendências

- **Aprovação** da `feat/refino` (e, antes, da `feat/conteudo` e da `feat/backend`).
- **Migração nova** `20261023000000_modelo_de_venda.sql`: rodar no Supabase depois da anterior e gerar o seed de novo
  (`pnpm supabase:seed`). Não testada contra um Supabase real (só PGlite).
- **Dados do responsável:** e-mail de contato (`NEXT_PUBLIC_CONTACT_EMAIL`); razão social, CNPJ/CPF e endereço em
  `lib/company.ts` antes de vender; prazos e trocas `[CONFIRMAR]` da /sobre; faixas, preço e prazo da entrega local;
  parâmetros reais da calculadora (taxas do Mercado Pago e impostos).
- **Melhor Envio:** criar conta e token (sandbox primeiro); não testado contra a API real. Etiqueta e rastreio pela API
  não foram feitos.
- **Jurídico/contábil** (ver `docs/operacao/modelo-de-venda.md`): tributos de importação, personalizados e arrependimento,
  textos de Envio e Trocas.
- **Fotos dos carros:** recortar e licenciar; nenhuma ligada ao site.
- As pendências anteriores continuam (licenciamento de fotos, textos legais, branches antigas no GitHub).
