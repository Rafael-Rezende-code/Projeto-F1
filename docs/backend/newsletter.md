# Newsletter: como funciona e como ativar

A seção "Fique no grid" da home grava os e-mails numa tabela do Supabase (`newsletter_subscribers`).
**Sem o Supabase configurado, o formulário fica desabilitado e o botão diz "Em breve".** Nada é gravado no navegador.

## Ativar

1. Rode o `supabase/setup-completo.sql` (ele já inclui a migration `20261025000000_newsletter.sql`) ou, num projeto que
   já está no ar, só a migration nova, no SQL Editor.
2. Variável opcional **`NEWSLETTER_IP_SALT`** (qualquer texto longo e secreto, só no servidor): é o "sal" do hash do IP.
   Sem ela, o hash funciona do mesmo jeito, só sem o sal (defina antes de abrir ao público).
3. Conferir: `pnpm supabase:ativar` testa a tabela, que o visitante consegue se inscrever, que NÃO consegue ler a lista
   e que a inscrição sem consentimento é recusada.

## O que o formulário faz

- **Consentimento obrigatório**: caixa "Quero receber novidades e lançamentos da Apex por e-mail." + frase de finalidade
  ("Usaremos seu e-mail somente para enviar novidades e lançamentos da Apex."). O texto exato que a pessoa viu é gravado
  em `consent_text` junto com a inscrição (prova do consentimento). Os textos ficam em `lib/newsletter-text.ts`.
- **Contra robôs**: campo isca escondido (`website`; preenchido = robô, o servidor responde "ok" sem gravar) e limites no
  banco (gatilho `newsletter_limits`): no máximo **5 inscrições por IP por hora** e **300 no total por hora** (mude o
  número na migration se fizer uma campanha grande). O IP **nunca é gravado**: só um hash com sal (`ip_hash`).
- **E-mail que já estava na lista** recebe o mesmo "ok" (não revela quem já se inscreveu).
- **Segurança (RLS)**: a chave pública só consegue INSERIR, e só as colunas `email`, `consent`, `consent_text`, `source` e
  `ip_hash`, com consentimento verdadeiro. Ler, alterar e apagar: só administradores (`is_admin()`).
  Testes em `supabase/tests/newsletter.test.ts` e em `lib/newsletter.test.ts`.

## Painel

`/admin/newsletter`: total e ativos, os 500 mais recentes e o botão **Baixar CSV** (todos os inscritos, separador `;`,
com BOM para abrir certo no Excel; células que começam com `=`, `+`, `-` ou `@` ganham um apóstrofo, proteção contra
fórmula embutida). Descadastrar: marque `unsubscribed_at` na tabela (Table Editor) ou apague a linha.

## O que NÃO existe (e o site não promete)

- **Descadastro automático** (link "cancelar" nos e-mails) e **confirmação por e-mail (double opt-in)**: dependem de um
  serviço de e-mail (Resend, Brevo...), que a loja ainda não tem. Por isso a frase de finalidade só diz para que o
  e-mail é usado, sem prometer "cancele quando quiser".
- **Envio das campanhas**: a tabela só guarda a lista. O envio é feito em outra ferramenta, com o CSV.
- **Política de privacidade**: o texto jurídico é do responsável (`/politica-de-privacidade`); quando existir, convém
  linkar a política na frase de finalidade.
