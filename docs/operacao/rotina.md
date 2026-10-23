# Rotina de operação da loja

O que fazer no dia a dia depois do lançamento, usando o painel `/admin`. Tudo aqui depende do Supabase ativo.

## Todo dia

1. **Início do painel** (`/admin`): "Pedidos pagos para enviar", "Itens para comprar no fornecedor" e "Estoque baixo".
2. **Comprar no fornecedor** (`/admin/fornecedor`): para cada item, abrir o link, comprar com o endereço do cliente
   ("Copiar endereço e dados"), registrar com "Marcar comprado" e o rastreio do fornecedor.
3. **Enviar** os pedidos pagos de estoque próprio: no detalhe do pedido, código de rastreio → "Marcar como enviado"
   (o cliente recebe o e-mail "Pedido a caminho" e vê o rastreio em `/pedido/consultar`).
4. **E-mails com falha:** no detalhe do pedido, a seção "E-mails ao cliente" mostra "falhou"; o envio é tentado de novo
   no próximo evento do pedido. Se precisar, responda o cliente manualmente.

## Toda semana

- **Pix e boletos em aberto** (`/admin/pedidos?status=aguardando-pagamento`): o Mercado Pago avisa o vencimento e o
  pedido é cancelado sozinho; confira os que estão parados há mais de 3 dias.
- **Exportar CSV** de pedidos da semana e da fila do fornecedor (cópia própria; ver `docs/lancamento.md`, seção 3b).
- **Backup** do banco (`supabase db dump`) se o plano não tiver backup diário.
- **Cupons** (`/admin/cupons`): desativar os que acabaram; conferir usos.

## Cancelamento e reembolso

1. No detalhe do pedido: **Cancelar pedido** com o motivo (vai para o histórico; o cliente recebe "Pedido cancelado").
   Estoque e uso do cupom voltam na mesma hora. Pedido já enviado pede uma confirmação a mais.
2. Se o cliente pagou, **estorne no Mercado Pago** (Atividade → pagamento → Devolver).
3. Volte ao pedido e use **Marcar como reembolsado** com os detalhes (valor, data, id do estorno).

Arrependimento (7 dias, CDC art. 49) e trocas seguem a política publicada em `/trocas-e-devolucoes` (texto a cargo do
responsável). Dúvidas de modelo de venda: `docs/operacao/modelo-de-venda.md`.

## Pedidos de teste

Ao testar em produção, marque o pedido como **teste** no detalhe (fica fora dos indicadores) e cancele-o.

## Fechamento do mês

- Exportar CSV de pedidos do mês (filtro "De/Até") para o contador.
- Conferir no Mercado Pago se os valores recebidos batem com o faturamento do painel (só pedidos pagos).
