# Política comercial: nada de promessa sem configuração

Regra: **o site não promete nada que a loja não tenha configurado.** Frete grátis, parcelamento, prazos, trocas,
garantia, área de entrega e avisos por e-mail vêm de `lib/store-policy.ts`, que lê variáveis de ambiente
(nomes e explicações em `.env.example`). **Sem a variável, o item não aparece.**

| Promessa | Variável | Onde aparece quando configurada |
| --- | --- | --- |
| Parcelas sem juros | `NEXT_PUBLIC_INSTALLMENTS_MAX` + `NEXT_PUBLIC_INSTALLMENTS_INTEREST_FREE=true` (+ `NEXT_PUBLIC_INSTALLMENT_MIN_CENTS`, opcional) | "ou Nx de R$ ... sem juros" na página do produto |
| Frete grátis | `NEXT_PUBLIC_FREE_SHIPPING_FROM_CENTS` | barra de progresso na sacola, Econômica grátis (frete simulado) e opção mais barata grátis (Melhor Envio) |
| Entrega local | `LOCAL_DELIVERY_ENABLED=true`, `LOCAL_DELIVERY_PRICE_CENTS`, `LOCAL_DELIVERY_DAYS_MIN`, `LOCAL_DELIVERY_DAYS_MAX` (+ `LOCAL_DELIVERY_FREE_FROM_CENTS`, opcional) | opção "Entrega local" no checkout, só para as faixas de CEP de `lib/shipping/config.ts` |
| Envio (frase) | `NEXT_PUBLIC_POLICY_SHIPPING_NOTE` | acordeão "Envio" da página do produto e /sobre |
| Trocas e devoluções (frase) | `NEXT_PUBLIC_POLICY_RETURNS_NOTE` | acordeão "Trocas e devoluções" e /sobre |
| Garantia (frase) | `NEXT_PUBLIC_POLICY_WARRANTY_NOTE` | acordeão "Garantia" da página do produto |
| Área de entrega (frase) | `NEXT_PUBLIC_POLICY_DELIVERY_AREA` | /sobre ("Entrega") |
| Avisos por e-mail do pedido | `NEXT_PUBLIC_POLICY_EMAIL_NOTIFICATIONS=true` | textos da página do pedido (ligue só quando existir serviço de e-mail) |

As variáveis `NEXT_PUBLIC_*` são lidas **no build**: mudou, faça novo deploy. As frases devem dizer exatamente o que a
loja se compromete a cumprir (são promessas ao consumidor). O parcelamento REAL do cartão é o da conta do Mercado Pago
(o Payment Brick mostra as parcelas reais no checkout); o que se anuncia na página do produto precisa ser igual ao que a
conta oferece. Os testes estão em `lib/store-policy.test.ts` e `lib/shipping/shipping.test.ts`.

## O que foi encontrado escrito à mão (feat/carros, 22/10/2026) e o que mudou

| # | Onde | Texto / valor | Situação |
| --- | --- | --- | --- |
| 1 | Página do produto | "ou 3x de R$ ... sem juros" (3 parcelas fixas) | **Removido**: agora só com `NEXT_PUBLIC_INSTALLMENTS_*` |
| 2 | Página do produto, acordeão "Envio" | placeholder "[CONTEÚDO A SER REDIGIDO] Prazos e valores de envio" (visível ao público) | **Some** sem `NEXT_PUBLIC_POLICY_SHIPPING_NOTE` |
| 3 | Página do produto, acordeão "Trocas e devoluções" | placeholder "[CONTEÚDO A SER REDIGIDO] Política de trocas" | **Some** sem `NEXT_PUBLIC_POLICY_RETURNS_NOTE` |
| 4 | Sacola | barra "Faltam R$ X para o frete grátis" com limite fixo de R$ 299,00 (`lib/cart/config.ts`) | **Some** sem `NEXT_PUBLIC_FREE_SHIPPING_FROM_CENTS` |
| 5 | Frete simulado e Melhor Envio | Econômica grátis / opção mais barata grátis acima de R$ 299,00 | **Só com o limite configurado** |
| 6 | Entrega local | R$ 10,00, grátis a partir de R$ 150,00, 1 a 2 dias úteis, ligada por padrão | **Desligada por padrão**; precisa de `LOCAL_DELIVERY_*` |
| 7 | /sobre, "Entrega" e "Trocas e devoluções" | "Entregamos em todo o Brasil." + "[CONFIRMAR]" (prazos e trocas) | **Somem** sem `NEXT_PUBLIC_POLICY_DELIVERY_AREA`, `..._SHIPPING_NOTE` e `..._RETURNS_NOTE` |
| 8 | Página do pedido (pix, boleto, cartão em análise, pedido recebido, pedido confirmado) | "enviamos a confirmação por e-mail", "avisamos por e-mail...", "avisamos quando saírem para entrega". **Não existe serviço de e-mail** | **Troquei** por "acompanhe nesta página" (volta o texto original com `NEXT_PUBLIC_POLICY_EMAIL_NOTIFICATIONS=true`) |
| 9 | Garantia | nenhuma garantia escrita no site | nada a remover; o acordeão "Garantia" só existe com `NEXT_PUBLIC_POLICY_WARRANTY_NOTE` |
| 10 | "Oficial" | **nenhuma** afirmação de loja oficial. Só avisos de que a loja NÃO é oficial (/sobre, textos editoriais, descrições) | mantidos; não há configuração para afirmar isso |

### Mantido de propósito (para o responsável decidir)

- **Frete simulado** (tabela por região, preços e prazos de EXEMPLO em `lib/shipping/simulated.ts`): é o plano B de
  demonstração enquanto o Melhor Envio não está configurado. Mostra "Chega em X a Y dias úteis" no checkout. **Antes de
  vender, configure o Melhor Envio** (`docs/backend/frete.md`); com ele, os preços e prazos vêm da transportadora.
- **Boleto**: "A confirmação do banco leva até 3 dias úteis" (informação do meio de pagamento, não da loja).
- **Prazo de envio por produto** ("Envio estimado em X a Y dias úteis", "Produto sob encomenda"): vem do cadastro do
  produto (admin), não do código; o padrão de 1 a 3 dias só aparece se o produto for sob encomenda ou passar de 3.
- **Páginas institucionais** (`/envio`, `/trocas-e-devolucoes`, `/faq`...): esqueletos com títulos de seção (um deles é
  "Valores e frete grátis", em `/envio`) e o marcador "[CONTEÚDO A SER REDIGIDO]". O texto é do responsável
  (jurídico). `pnpm qa:marcadores` lista tudo que ainda está como marcador.
- **Payment Brick** com no máximo 12 parcelas (`lib/payments/brick.ts`): é um teto técnico do componente; as parcelas
  reais exibidas são as da conta do Mercado Pago.
