# Frete

Refino 2, item 7. Código em `lib/shipping/` (cotação, só no servidor) e `lib/checkout/shipping.ts` (prazo total
mostrado no checkout).

## Como funciona

1. Na etapa **Endereço** do checkout, ao clicar em Continuar, o navegador chama a server action `quoteShipping`
   (`app/(loja)/checkout/actions.ts`) com o CEP e os SKUs da sacola.
2. O servidor busca no catálogo o preço, o **pacote** (peso e medidas da embalagem) e o **prazo de envio** de cada
   produto, e pede as opções a `getShippingQuotes` (`lib/shipping/index.ts`):
   - **Entrega local**, se o CEP estiver numa faixa atendida (`LOCAL_DELIVERY` em `lib/shipping/config.ts`);
   - o **provedor principal**: Melhor Envio quando há token; senão, o **simulado**. Se o Melhor Envio falhar ou
     demorar mais de 8 s, o checkout usa o simulado (e o erro vai para o log).
3. Cada opção mostra **"Chega em X a Y dias úteis"** = prazo de envio do item mais demorado da sacola + transporte.
4. Ao fechar o pedido, `placeOrder` **cota de novo** e só aceita uma opção que exista para aquele CEP e aquela sacola
   (o preço do frete nunca vem do cliente).

A interface comum é `ShippingProvider` (`lib/shipping/types.ts`): `quote({ destinationCep, items, subtotalCents })`
devolve `{ id, label, carrier?, transitDays: { min, max }, priceCents, fullPriceCents? }[]`.

## (a) Simulado (padrão)

`lib/shipping/simulated.ts`. Tabela por **região** do CEP de destino, a partir de MG (onde a loja fica), e por **peso
cobrado** (o maior entre o peso real e o cúbico C × L × A / 6000, arredondado para cima em kg):

| Região (1º dígito do CEP) | Econômica | Expressa |
| --- | --- | --- |
| MG (3) | R$ 19,90 + R$ 3/kg extra · 2–4 dias | R$ 34,90 + R$ 5/kg · 1–2 dias |
| SP, RJ, ES (0, 1, 2) | R$ 22,90 + R$ 4/kg · 3–6 | R$ 39,90 + R$ 6/kg · 1–3 |
| Sul e Centro-Oeste (7, 8, 9) | R$ 26,90 + R$ 5/kg · 4–8 | R$ 49,90 + R$ 8/kg · 2–4 |
| Nordeste (4, 5) | R$ 32,90 + R$ 7/kg · 6–12 | R$ 64,90 + R$ 10/kg · 3–6 |
| Norte (6) | R$ 39,90 + R$ 9/kg · 8–15 | R$ 79,90 + R$ 12/kg · 4–8 |

Valores de **exemplo**. A Econômica só é grátis se a loja configurar o limite em `NEXT_PUBLIC_FREE_SHIPPING_FROM_CENTS`
(`lib/store-policy.ts`); sem a variável, não há frete grátis (nem a barra na sacola).

## (b) Melhor Envio (pronto, desligado)

`lib/shipping/melhor-envio.ts` (chamada HTTP) e `melhor-envio-core.ts` (corpo e leitura da resposta, com testes).
Cota por CEP de origem e destino, peso (kg) e medidas (cm) de cada item, com seguro pelo preço.

1. Crie a conta em https://melhorenvio.com.br (para testar, use o **sandbox**: https://sandbox.melhorenvio.com.br, com
   conta separada).
2. Gere um token em *Integrações → Permissões de acesso* (escopo `shipping-calculate`).
3. Variáveis (Vercel → Settings → Environment Variables):
   - `MELHOR_ENVIO_TOKEN`: o token (só no servidor; nunca `NEXT_PUBLIC_`);
   - `MELHOR_ENVIO_ENV`: `production` para a conta real (sem ela, usa o sandbox);
   - `SHIPPING_ORIGIN_CEP`: CEP de onde você posta (padrão 37950-000);
   - `MELHOR_ENVIO_CONTACT_EMAIL`: e-mail de contato exigido no cabeçalho `User-Agent` da API;
   - `MELHOR_ENVIO_SERVICES` (opcional): ids dos serviços aceitos, separados por vírgula (ex.: `1,2` = PAC e SEDEX).
     Vazio: todos os que a API devolver sem erro.
4. Novo deploy. As opções passam a vir das transportadoras; com frete grátis, a mais barata sai por R$ 0.

Ainda **não** feito (fora do escopo): comprar a etiqueta e gerar o rastreio pelo Melhor Envio (hoje o rastreio é
digitado no painel).

## (c) Entrega local (São Sebastião do Paraíso, MG e região)

`lib/shipping/local.ts`, configurada em `LOCAL_DELIVERY` (`lib/shipping/config.ts`):

- `ranges`: faixas de CEP atendidas (hoje 37950-000 a 37959-999, São Sebastião do Paraíso). Para atender cidades
  vizinhas, acrescente as faixas delas. **[CONFIRMAR]** as faixas.
- **Só existe se configurada** (preço e prazo são promessas; nada é escrito à mão): `LOCAL_DELIVERY_ENABLED=true` e
  `LOCAL_DELIVERY_PRICE_CENTS`, `LOCAL_DELIVERY_DAYS_MIN` e `LOCAL_DELIVERY_DAYS_MAX` preenchidos. `LOCAL_DELIVERY_FREE_FROM_CENTS`
  (opcional): grátis a partir desse subtotal; sem ele, nunca é grátis. **[CONFIRMAR]** as faixas de CEP com quem entrega.
- Sem essas variáveis, a opção "Entrega local" não aparece no checkout.

A entrega local aparece em primeiro lugar, junto com as outras opções.

## Prazos

- **Prazo de envio** (por produto, no painel: "Venda e envio"): dias úteis até postar. Estoque próprio costuma ser
  1–2; sob encomenda depende do fornecedor.
- **Transporte**: o da opção de frete.
- O pedido inteiro leva o prazo do item mais demorado; quando os prazos diferem, sacola e checkout avisam que o pedido
  pode chegar em mais de um pacote. Hoje a cotação considera **um** envio; se você despachar em pacotes separados, o
  frete extra fica por conta da loja (ver `docs/operacao/modelo-de-venda.md`).

## Testes

`lib/shipping/shipping.test.ts` (simulado, local, corpo e resposta do Melhor Envio) e `e2e/modelo-de-venda.spec.ts`
(entrega local e prazo total no checkout). Não testado contra a API real do Melhor Envio (sem token nesta sessão).
