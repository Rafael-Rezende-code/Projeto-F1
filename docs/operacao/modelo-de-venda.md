# Modelo de venda: estoque próprio e sob encomenda

Documento interno de operação (refino 2, item 8). Explica os dois modelos, o caminho de um pedido em cada um, o direito
de arrependimento e quem responde pelo prazo de entrega. **Não é parecer jurídico**: as referências legais servem para
orientar a conversa com o advogado e o contador antes de vender. Os textos que o cliente lê (Termos, Trocas, Envio)
continuam a ser redigidos pelo responsável.

## Os dois modelos

| | Estoque próprio | Sob encomenda |
| --- | --- | --- |
| O que é | A peça já está com a loja. | A loja compra a peça no fornecedor **depois** que o cliente paga. |
| No site | Sem aviso especial; prazo de envio curto (ex.: 1–2 dias úteis). | "Produto sob encomenda" (+ "Importado", se for o caso) e "Envio estimado em X a Y dias úteis". |
| Estoque no painel | Unidades na prateleira. | Quantas unidades a loja aceita encomendar (ex.: 5). Acabou: o tamanho aparece esgotado. |
| Risco principal | Capital parado e peças encalhadas. | Atraso ou falta no fornecedor; qualidade que a loja não viu. |
| Dados no painel | Custo (privado), prazo, peso e medidas. | Também o **link do fornecedor**, o frete do fornecedor e notas (privados). |

Os campos ficam no produto, no painel (`/admin/produtos/...`): "Venda e envio" (aparece na loja) e "Custo e fornecedor"
(privado, nunca vai para a loja). O preço pode ser calculado pela calculadora do mesmo formulário.

## Fluxo do pedido

Status do **pedido**: aguardando pagamento → pago → enviado → entregue (ou recusado/cancelado, com o estoque devolvido).
Status de cada **item**: separando / aguardando compra → comprado → enviado → entregue.

### Estoque próprio

1. Cliente paga (cartão aprova na hora; Pix e boleto quando o Mercado Pago avisa).
2. O item nasce como **separando**. Separe e embale.
3. Poste e, no detalhe do pedido, use **Marcar como enviado** com o código de rastreio. Os itens passam a **enviado** e o
   cliente vê o código na página do pedido.
4. Entregue: quando a transportadora confirmar (hoje, atualização manual).

### Sob encomenda

1. Cliente paga. O item nasce como **aguardando compra no fornecedor** e aparece na fila **Comprar no fornecedor**
   (`/admin/fornecedor`), mais antigos primeiro. **Não compre antes do pagamento aprovado.**
2. Na fila: **Abrir no fornecedor** → compre manualmente. Duas formas:
   - **Direto para o cliente**: use **Copiar endereço e dados** e cole no checkout do fornecedor. Mais rápido, mas a
     loja não confere a peça; prefira fornecedores confiáveis e embalagem neutra (sem nota/preço do fornecedor dentro).
   - **Para a loja**: use o endereço da loja, confira a peça e reenvie (mais lento e com frete duplo, mas com controle).
3. **Marcar comprado**, com o rastreio do fornecedor (se já houver). O rastreio do fornecedor fica só no painel.
4. Se o fornecedor mandou direto para o cliente, copie o código para **Marcar como enviado** no pedido (o cliente só vê
   o rastreio "para o cliente"). Se veio para a loja, reenvie e marque como enviado com o código novo.
5. Atraso do fornecedor: **avise o cliente antes de o prazo prometido vencer** e ofereça esperar ou cancelar com
   reembolso integral.

### Pedido misto (os dois modelos)

O site mostra o prazo do item mais demorado e avisa que o pedido pode chegar em mais de um pacote. Decida por pedido:
esperar tudo e mandar junto (um frete) ou mandar o que está pronto e o resto depois. **O segundo envio é custo da
loja**: a cotação do checkout considera um envio só.

## Prazo de entrega: de quem é a responsabilidade

- **A loja responde pelo prazo que anunciou**, mesmo quando quem atrasa é o fornecedor ou a transportadora. Para o
  cliente, o fornecedor é da loja (no CDC, todos da cadeia de fornecimento respondem; a loja pode depois cobrar o
  fornecedor). Por isso o prazo exibido precisa ser **realista**: use o máximo que o fornecedor costuma cumprir, não o
  mínimo anunciado por ele.
- O site já mostra o prazo **antes** da compra (página do produto, sacola e checkout), como pede o Decreto 7.962/2013
  (informação clara sobre a oferta, incluindo prazo de entrega).
- Prazo descumprido: o cliente pode, à escolha dele, exigir o cumprimento, aceitar outro produto equivalente ou
  cancelar com devolução do que pagou (CDC, art. 35). Na prática: avise antes de vencer e ofereça as opções.
- **Importados**: se a peça vier do exterior direto para o cliente, pode haver imposto de importação e atraso na
  alfândega. Defina **antes de vender** quem paga os tributos (o preço deve deixar isso claro; o ideal é a loja
  absorver ou importar e revender) e considere o tempo de alfândega no prazo máximo. **[CONFIRMAR com o contador]**.

## Direito de arrependimento (7 dias)

- Compra pela internet: o cliente pode desistir em **7 dias corridos contados do recebimento**, sem dar motivo (CDC,
  art. 49). Vale para os dois modelos, inclusive sob encomenda e importado.
- Devolução **integral**, com o frete de ida, pelo mesmo meio de pagamento (no cartão, a loja pede o estorno à
  administradora: Decreto 7.962/2013, art. 5º). O frete da devolução é da loja.
- A loja precisa informar como exercer o direito, de forma clara, e confirmar o recebimento do pedido de desistência.
- **Risco do sob encomenda**: se o cliente desistir, a peça volta para a loja (não para o fornecedor, em geral). Conte
  esse risco no preço (a calculadora tem o campo de margem) e prefira fornecedores que aceitam devolução.
- Peça **personalizada** (nome, número sob pedido): há discussão sobre a exceção; **[CONFIRMAR com o advogado]** antes
  de vender personalizados.
- Troca por tamanho ou defeito é outra regra (garantia legal de 30 dias para vício aparente em produto não durável e
  90 dias em durável, CDC art. 26; política de trocas da loja). Prazos e regras da política de trocas: **[CONFIRMAR]**.

## Checklist antes de vender sob encomenda

- [ ] Fornecedor testado (pelo menos uma compra de teste), com prazo médio anotado nas notas do produto.
- [ ] Prazo máximo do produto = prazo real do fornecedor + folga.
- [ ] Custo, frete do fornecedor e link preenchidos (privados) e preço conferido na calculadora.
- [ ] Peso e medidas da embalagem preenchidos (frete).
- [ ] Definido quem paga tributos de importação (importados).
- [ ] Textos de Envio e Trocas publicados pelo responsável.
