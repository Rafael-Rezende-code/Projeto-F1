# Roteiro de teste do /admin (login por link mágico, importador, edição e fila do fornecedor)

O login do painel usa um link mágico enviado por e-mail: só você consegue clicar nele. Este roteiro é o passo a passo
exato. O script `pnpm supabase:ativar` (docs/backend/supabase.md) já testou tudo o que não depende de clique (conexão,
tabelas, regras de acesso, baixa de estoque e o importador, pela mesma camada de código do painel). Aqui você confere
o que ele não consegue: o e-mail, a tela e o fluxo de uso.

## 0. O que depende de você no painel do Supabase

Faça uma vez, no projeto (https://supabase.com/dashboard):

1. **SQL Editor:** rode o `supabase/setup-completo.sql` inteiro (se ainda não rodou). O `pnpm supabase:ativar` avisa
   quais tabelas ou funções faltam.
2. **Authentication → Sign In / Providers → Email:** ligado. Em **Authentication → Sign In / Up**, deixe **Allow new
   users to sign up** DESLIGADO (o painel não cria usuários).
3. **Authentication → Users → Add user → Create new user:** o MESMO e-mail que está em `ADMIN_EMAILS`, com *Auto
   Confirm User* marcado. (O painel só envia o link para quem já existe.)
4. **Authentication → URL Configuration:**
   - *Site URL*: `http://localhost:3000` (para este teste local; na prévia da Vercel, a URL dela, ver o fim deste arquivo);
   - *Redirect URLs*: `http://localhost:3000/admin/entrar/callback` (e, depois, a URL da prévia + `/admin/entrar/callback`).
5. **E-mail do link mágico:** o envio padrão do Supabase é só para teste (limite baixo por hora e, em projetos novos,
   só entrega para e-mails da própria equipe do projeto em Organization → Team). Se o link não chegar, configure um
   SMTP próprio em **Authentication → Emails → SMTP Settings** (Resend, Brevo, Amazon SES...). O modelo do e-mail
   padrão ("Magic Link") serve como está.
6. **Storage:** o bucket `produtos` deve existir e ser **Public** (o setup cria; o script confere).
7. **`.env.local`** com as 4 variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API) e `ADMIN_EMAILS` (o mesmo e-mail do passo 3, em minúsculas).
   Reinicie o `pnpm dev` depois de mudar o arquivo.

Confirme: `pnpm supabase:ativar` deve terminar com **✖ falharam: 0**.

## 1. Entrar

1. `pnpm dev` e abra http://localhost:3000/admin/entrar.
2. Digite o e-mail de administrador e envie. A tela diz "Se este e-mail tiver acesso, o link chega em instantes".
3. Abra o e-mail **no mesmo navegador** onde pediu (o login usa PKCE: o link precisa voltar para o mesmo navegador) e
   clique em **Log In** (o link vale 1 hora).
4. Você cai em `/admin` (painel). Se voltar para `/admin/entrar`, veja o fim deste roteiro ("Se algo falhar").

## 2. Importar o CSV de exemplo

1. **Produtos** → **Importar CSV** (`/admin/produtos/importar`).
2. Escolha `docs/modelos/produtos-exemplo.csv`. Deve aparecer a **prévia**: 3 linhas **novas**, sem erro:
   TESTE Camiseta (estoque próprio), TESTE Miniatura (sob encomenda, importada) e TESTE Boné (com 1 foto).
3. Clique em **Importar**. O relatório mostra **3 criados**, 0 pulados e nenhum problema de foto. O boné ganha a foto
   (vem da URL do Unsplash, vai para o Storage).
4. Importe o mesmo arquivo **de novo**: agora aparece **3 atualizados** (sem duplicar).
5. Confira na loja: http://localhost:3000/produtos?q=teste mostra os 3. (O catálogo do banco tem cache de 60 s; se não
   aparecerem na hora, espere um minuto.) Em nenhuma página deve aparecer custo, fornecedor ou "NOTA-PRIVADA".

## 3. Editar um produto

1. **Produtos** → **TESTE Camiseta Importador Apex**.
2. Troque o preço de R$ 129,90 para **R$ 139,90** e o estoque do tamanho **M** de 5 para **8**. Salve.
3. Abra http://localhost:3000/produtos/teste-importador-camiseta: preço novo e tamanho M disponível.
4. De volta ao formulário, em **Custo e fornecedor** (privado): custo R$ 47,13. Abra a **calculadora de preço** e veja
   a margem. Esses campos só existem aqui.

## 4. Fazer um pedido de teste e ver a fila "Comprar no fornecedor"

1. Na loja, abra **TESTE Miniatura Importador Apex** ("Produto sob encomenda" + "Importado", envio em 15 a 25 dias
   úteis), escolha o tamanho **Único**, **Adicionar à sacola** e vá para o **Checkout**.
2. Preencha com dados de teste (um CEP real para o frete, ex.: 01310-100) e escolha **Cartão de crédito**. Sem o
   Mercado Pago configurado, o pagamento é **simulado** e o cartão é aprovado na hora. Confirme.
3. Você vai para `/pedido/APX-...?t=...`: página do pedido, com o status por item.
4. No painel: **Pedidos** mostra o pedido como **pago**. Abra-o: o item da miniatura está **aguardando compra**.
5. **Comprar no fornecedor** (`/admin/fornecedor`): o item aparece (só itens sob encomenda de pedidos PAGOS). Teste:
   - **Abrir no fornecedor**: abre o link privado (`fornecedor-teste.example.com`, não existe de verdade);
   - **Copiar endereço e dados**: cola nome, endereço, CEP, telefone e e-mail do cliente;
   - **Rastreio do fornecedor**: digite `TESTE123` e **Marcar comprado**: o item sai da fila.
6. Volte ao pedido, **Marcar como enviado** com o rastreio `BR123456789TESTE`. Na página do cliente
   (`/pedido/...?t=...`) o status do item muda.

## 5. Limpar o que o teste criou

No **SQL Editor** do Supabase (apaga os 3 produtos de teste com variantes, fotos e dados privados, e os pedidos de teste):

```sql
delete from public.orders where id in (select order_id from public.order_items where sku like 'TESTE-IMPORTADOR-%');
delete from public.products where slug like 'teste-importador-%';
-- opcional: cliente do pedido de teste (troque pelo e-mail que usou no checkout)
-- delete from public.customers where email = 'seu-email-de-teste@exemplo.com';
```

(O estoque dos produtos de teste some junto. Os produtos normais da loja não são tocados.) As fotos do boné ficam no
Storage em `produtos/importados/teste-importador-bone/`: apague pela aba Storage se quiser.

## Se algo falhar

| Sintoma | Causa provável |
| --- | --- |
| O e-mail não chega | SMTP padrão limitado: configure um SMTP próprio (item 0.5), olhe o spam e confira o e-mail do passo 3 |
| Clicou no link e voltou para `/admin/entrar` | A *Redirect URL* não está cadastrada (item 0.4), ou abriu o link em outro navegador (PKCE) |
| "Sem permissão" ao importar | O e-mail não está em `admin_emails` no banco (o `pnpm supabase:ativar` insere os de `ADMIN_EMAILS`) |
| Produtos importados não aparecem na loja | Cache de 60 s do catálogo; ou o produto entrou como **rascunho** (foto que falhou: veja o relatório) |
| O pedido não aparece em "Comprar no fornecedor" | Só entram itens **sob encomenda** de pedidos **pagos**; o Pix simulado fica "aguardando pagamento": use o cartão |
| O painel mostra só "como ativar" | Faltam variáveis no `.env.local` (ou o servidor não foi reiniciado) |

## Prévia da Vercel com o Supabase (somente Preview)

Em **Vercel → Project → Settings → Environment Variables**, crie as variáveis abaixo marcando **apenas Preview**
(desmarque Production e Development; use "Sensitive" nas secretas). Não precisa de nenhuma para o Mercado Pago:
a prévia continua com pagamento simulado.

| Variável | Valor | Observação |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon (public) | pública (o RLS protege os dados) |
| `SUPABASE_SERVICE_ROLE_KEY` | chave service_role | **secreta**; só servidor; marque *Sensitive* |
| `ADMIN_EMAILS` | seus e-mails de administrador, separados por vírgula | em minúsculas |
| `NEXT_PUBLIC_SITE_URL` | URL estável da prévia desta branch | ver abaixo |

`NEXT_PUBLIC_SITE_URL` é obrigatória na prévia: o link mágico volta para `SITE_URL`, que sem a variável aponta para o
site de produção. Use a URL **da branch** (não a de cada deploy), no formato
`https://<projeto>-git-feat-carros-<time>.vercel.app` (Vercel → Deployments → a prévia → Domains), e ao criar a
variável restrinja a **Preview → branch `feat/carros`**. Depois cadastre essa URL no Supabase: *Redirect URLs* =
`<URL>/admin/entrar/callback` (e, se quiser, `*` curingas: `https://<projeto>-git-*-<time>.vercel.app/**`).
Faça um novo deploy depois de criar as variáveis (elas valem a partir do próximo build).
