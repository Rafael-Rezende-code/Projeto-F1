# Mercado Pago: como ativar (fase 10)

O código está pronto e **desligado**. Sem as variáveis, o checkout continua com o provedor simulado (nada é cobrado).
Com elas, a etapa de pagamento mostra o **Payment Brick** oficial do Mercado Pago (Pix, cartão de crédito em até 12x
e boleto) e o servidor cria o pagamento de verdade.

> **Use junto com o Supabase** (docs/backend/supabase.md). Sem banco, o pagamento funciona, mas o pedido não fica
> gravado: o webhook não tem pedido para atualizar e a página do pedido só existe na aba em que a compra foi feita.

## O que está no repositório

| Arquivo | O quê |
| --- | --- |
| `components/checkout/mercado-pago-brick.tsx` | Payment Brick (SDK `@mercadopago/sdk-react`), carregado só com o Mercado Pago ligado |
| `lib/payments/mercado-pago.ts` | `MercadoPagoProvider`: cria o pagamento (`POST /v1/payments`) com o valor do servidor e chave de idempotência por pedido |
| `lib/payments/mercado-pago-core.ts` | Parte pura (com testes): corpo do pagamento, leitura da resposta, assinatura e tratamento do webhook |
| `app/api/webhooks/mercadopago/route.ts` | Webhook: valida a assinatura, busca o pagamento na API, atualiza o pedido; idempotente |
| `components/checkout/order-view.tsx` | Páginas de status: Pix (QR Code + copia e cola), boleto (link + linha digitável), aprovado, em análise, recusado |

## Segurança (PCI)

- Número, validade e CVV do cartão **só existem dentro do Brick** (iframe do Mercado Pago). O nosso servidor recebe um
  `token` de uso único. Nada de cartão é gravado.
- O cartão decorativo do checkout mostra a **bandeira** (descoberta pelo BIN, via SDK) e os **últimos 4 dígitos**
  (devolvidos pelo Brick no envio). Os últimos 4 só aparecem no envio: antes disso o Brick não os expõe.
- O valor cobrado é sempre o calculado no servidor (com Supabase, o total calculado pelo banco), nunca o do navegador.
- CPF: o Brick pede quando o meio exige (boleto e cartão no Brasil). O campo de CPF próprio da loja só existe no modo
  simulado (boleto).

## Passo a passo

1. **Conta e aplicação:** https://www.mercadopago.com.br/developers → *Suas integrações* → *Criar aplicação* (tipo
   "Pagamentos online", produto "Checkout Transparente / Bricks").
2. **Credenciais de TESTE** (*Credenciais de teste*): copie a *Public Key* e o *Access Token*.
3. **Variáveis** no `.env.local` e na Vercel (Preview primeiro):
   - `NEXT_PUBLIC_MP_PUBLIC_KEY` = Public Key
   - `MP_ACCESS_TOKEN` = Access Token (só servidor)
   - `NEXT_PUBLIC_SITE_URL` = URL pública https do site (a URL do webhook vai junto em cada pagamento)
   - **Novo deploy** depois de mudar as variáveis (o modo do checkout é decidido no build).
4. **Webhook:** *Suas integrações* → aplicação → *Webhooks* → *Configurar notificações*:
   - URL de teste/produção: `https://<seu-dominio>/api/webhooks/mercadopago`
   - Evento: **Pagamentos**
   - Salve e copie a **assinatura secreta** para `MP_WEBHOOK_SECRET`.
   - Use o botão de simular notificação do painel: a rota deve responder 200 (ou 401 se a assinatura não conferir).
   - Localhost não recebe webhook. Para testar localmente, use um túnel (ex.: `cloudflared tunnel`) e ponha a URL do
     túnel em `NEXT_PUBLIC_SITE_URL`.
5. **Testar** (credenciais de teste) com os cartões de teste do Brasil (validade 11/30):

   | Bandeira | Número | CVV |
   | --- | --- | --- |
   | Mastercard | 5480 8328 0103 3311 | 123 |
   | Visa | 4235 6477 2802 5682 | 123 |
   | American Express | 3753 651535 56885 | 1234 |

   O **nome do titular** define o resultado: `APRO` (aprovado), `CONT` (pendente), `OTHE` (recusado), `FUND` (saldo
   insuficiente), `SECU` (CVV inválido), `EXPI` (vencimento), `FORM` (erro de formulário), `CALL` (pedir
   autorização). CPF de teste: `12345678909`. Fonte:
   https://www.mercadopago.com.br/developers/en/docs/checkout-bricks/integration-test/test-cards
   Pix e boleto de teste geram o QR/boleto, mas não são pagos sozinhos: o status muda pelo painel/simulação.
6. **Ir para produção:** no painel, complete os dados da conta e *ative as credenciais de produção*; troque
   `NEXT_PUBLIC_MP_PUBLIC_KEY` e `MP_ACCESS_TOKEN` pelas de produção (Production na Vercel), configure o webhook de
   produção com a mesma URL e a nova assinatura em `MP_WEBHOOK_SECRET`, faça o deploy e uma compra real de valor baixo
   (estorne pelo painel depois).

## Fluxo

1. O cliente preenche contato, endereço e entrega; na etapa de pagamento, aceita os termos e usa o Brick.
2. O Brick devolve o `formData` (token do cartão, ou dados do Pix/boleto). A server action `placeOrder` valida tudo,
   grava o pedido e baixa o estoque (Supabase), e cria o pagamento com o total do servidor.
3. Resultado:
   - **Cartão aprovado** → pedido "pago" → página "Pedido confirmado", com bandeira e final do cartão.
   - **Cartão recusado** → o cliente continua no checkout com o motivo (o pedido é cancelado e o estoque volta).
   - **Cartão em análise / Pix / boleto** → "aguardando pagamento" → página com QR Code + copia e cola ou link do
     boleto. A página se atualiza sozinha (a cada 8 s, por até 15 min) e muda quando o webhook confirmar.
4. **Webhook**: valida a assinatura (HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` com a chave
   secreta, tolerância de 15 min), busca o pagamento na API (o corpo da notificação nunca é usado como verdade),
   atualiza o pedido pela `external_reference` e registra a notificação em `payment_events` (idempotência). Recusado
   ou cancelado devolve o estoque uma vez só; um pedido já pago/enviado não volta para trás.

### Desconto no Pix (loja extra)

Com `NEXT_PUBLIC_PIX_DISCOUNT_PERCENT` > 0, o desconto é calculado NO SERVIDOR: a `create_order` recebe o percentual da
política (`pix_percent`, limitado a 0–30) e só o aplica quando o meio é Pix, sobre o subtotal depois de cupom e kit e sem o
frete. O pedido grava `payment_method`, `payment_discount_percent` e `payment_discount_cents`, e o `total_cents` já sai
com o desconto. O pagamento no Mercado Pago é criado com esse total (`transaction_amount`): **o Pix é gerado com o valor
já descontado**, e cartão/boleto com o valor cheio. O Brick é iniciado com o valor cheio (ele escolhe o meio); o resumo do
checkout mostra à parte "No Pix: R$ X". O meio que vale é o devolvido pelo Brick no envio (`methodFromBrick`), não o que o
navegador diz: o servidor recalcula o desconto por ele.

## Testes

`pnpm test` roda `lib/payments/mercado-pago-core.test.ts`: assinatura válida, adulterada, de outra chave e velha;
webhook (401 com assinatura inválida, aprovado grava no pedido certo, notificação repetida não grava de novo, outros
tipos ignorados, erro → 500 sem marcar como processado); leitura de Pix, boleto e cartão; corpo do pagamento.

## Não testado nesta sessão

A integração não foi exercitada contra o Mercado Pago real (sem credenciais). Faça o roteiro do passo 5 em Preview
antes de ligar em produção.
