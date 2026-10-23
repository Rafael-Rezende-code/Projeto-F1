# E-mails: como ativar

Pronto e **desligado**. Sem as variáveis, os e-mails do pedido são só registrados no log do servidor (provedor
"console": assunto e destinatário mascarado, nada sai). Com elas, saem pelo [Resend](https://resend.com).

## Quais e-mails

Só para pedidos **gravados** (Supabase ativo); no modo simulado nada é enviado.

| E-mail | Quando sai |
| --- | --- |
| Pedido recebido | Pix ou boleto gerado (pagamento pendente) ou cartão em análise |
| Pagamento aprovado | O pedido passa a "pago" (na hora, no cartão; ou pelo webhook do Mercado Pago) |
| Pedido a caminho | O admin marca como enviado (com o código de rastreio) |
| Pedido cancelado | O admin cancela, ou o Mercado Pago avisa que o pagamento foi cancelado/expirou |

Pagamento recusado não gera e-mail (o cliente vê a mensagem na hora). Cada tipo sai **uma vez por pedido**: a tabela
`email_log` (migração `20261029000000_emails.sql`, no `supabase/atualizacao-2.sql`) tem pedido + tipo únicos, então o
webhook repetido ou a correção do código de rastreio não reenviam. Falha de envio fica como "falhou" e é tentada de
novo na próxima vez que o mesmo evento acontecer (até 5 tentativas). O detalhe do pedido no `/admin` mostra o registro.
O conteúdo dos e-mails não é guardado. Modelos em `lib/email/templates.ts` (prévia em `docs/operacao/prints/email-*.png`).

## Ativar o Resend

1. Crie a conta em https://resend.com e adicione o **domínio** da loja (Domains → Add domain).
2. No DNS do domínio, crie os registros que o Resend mostrar (SPF/MX de retorno e DKIM; DMARC recomendado:
   `v=DMARC1; p=none;`). Espere o domínio ficar **Verified**. Sem domínio verificado, só dá para enviar para o próprio
   e-mail da conta (o remetente de teste `onboarding@resend.dev`).
3. API Keys → Create API key, permissão **Sending access**, restrita ao domínio. Copie a chave (aparece uma vez).
4. Na Vercel (Settings → Environment Variables), em **Production** (e Preview, se quiser testar lá):
   - `RESEND_API_KEY` = a chave (só servidor; nunca com `NEXT_PUBLIC_`);
   - `EMAIL_FROM` = remetente com o domínio verificado, ex.: `Apex <pedidos@sua-loja.com.br>`.
   - Opcional: `NEXT_PUBLIC_CONTACT_EMAIL` vira o "responder para" (reply-to).
5. **Novo deploy** (as variáveis só valem a partir do próximo).
6. Teste: faça um pedido com Pix (credenciais de teste do Mercado Pago) usando o seu e-mail; deve chegar "Pedido
   recebido". No `/admin`, o detalhe do pedido mostra "pedido-recebido · enviado".

## E-mails do login do painel (Supabase Auth, SMTP)

O link mágico do `/admin/entrar` é enviado pelo **Supabase**, não pela loja. O servidor de e-mail padrão do Supabase é só
para testes (limite baixo de envios por hora e remetente genérico). Para produção, use o mesmo Resend como SMTP:

1. Supabase → Project Settings → Authentication → **SMTP Settings** → Enable custom SMTP.
2. Host `smtp.resend.com`, porta `465`, usuário `resend`, senha = uma API key do Resend (pode ser outra, só de envio),
   remetente = um endereço do domínio verificado (ex.: `painel@sua-loja.com.br`), nome = nome da loja.
3. Authentication → Rate Limits: ajuste o limite de e-mails por hora se precisar.
4. Authentication → Email Templates → "Magic Link": traduza o texto se quiser (o link `{{ .ConfirmationURL }}` precisa
   continuar no corpo).

## O que não foi testado

O envio real pelo Resend e o SMTP do Supabase **não foram testados** (sem credenciais nesta sessão). Testado: modelos,
chamada HTTP do Resend com resposta simulada, regras de quando enviar e a idempotência do `email_log` no PGlite.
