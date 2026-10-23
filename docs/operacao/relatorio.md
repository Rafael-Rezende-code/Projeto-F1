# Relatório: carros (parte A) e operação (parte B)

Branch `feat/carros`, sem merge na `main`. 23/10/2026.

## Commits

| Item | Hash |
| --- | --- |
| A1 + A2: carro com um relógio só, texto revelado pelo carro | `46a1fc0` |
| A3: luz e contorno por piloto | `3b7e46a` |
| A4: /admin lista variáveis ausentes | `87f7c4d` |
| A5: diagnóstico do AVIF da senna-sentado | `1dc3d40` |
| B0: .gitignore, e2e espera a hidratação, páginas de erro | `ad5483f` |
| B1a: WhatsApp | `e4d9209` |
| B1b: frete por CEP | `c5de88f` |
| B1c: cupons + `atualizacao-2.sql` | `b863638` |
| B1d: /pedido/consultar + limite por IP | `1ed3c4e` |
| B2: histórico, cancelamento, reembolso, CSV, painel, pedidos de teste | `2fcccb6` |
| B3: e-mails | `1664dd7` |
| B4: GA4/Meta Pixel com consentimento | `99ef3fa` |
| B5: segurança | `696a84a` |
| B6: miniatura que voa até a sacola, esqueletos | `9393640` |
| B7: documentação de lançamento e operação | `bcaa456` |
| QA final (correção de 360px) | `a971192` |

## Carro: antes × depois

Traces no build de produção, Chromium headless com compositor por software. Detalhes e GIFs em
`docs/carros/a1/medicao.md`.

| | Antes | Depois |
| --- | --- | --- |
| Carro começa depois do início da assinatura | ~2,2 s | **~0,355 s** (1×); 0,36–0,43 s com CPU 4× |
| Duração | 1,35 s | 1,5 s |
| Quadros acima de 33 ms com CPU 4× | 0–1 | 0–1 (meta de no máximo 2: atendida) |
| Maior intervalo sem limitação de CPU | 20–24 ms | 19–38 ms |

A meta "nenhum quadro acima de 20 ms sem limitação" **não foi atendida de forma estável** neste ambiente. O custo é o
desenho do compositor por software, que é igual antes e durante a entrada. Não há tarefa longa na thread principal.

## O que passou (build de produção)

- `tsc`: sem erros. `lint`: 0 erros (2 avisos conhecidos). `build`: ok.
- Testes unitários e de banco: **200 em 44 arquivos**. Incluem:
  - cupons: vencido, mínimo, esgotado, concorrência no último uso, devolução;
  - cancelamento: transação, falha no meio desfaz tudo, confirmação de pedido enviado, idempotência;
  - consulta de pedido: mesma resposta para "não existe" e "e-mail errado", sem dados pessoais;
  - autorização do admin: 14 ações/rotas e 12 páginas recusam quem não tem sessão e quem tem sessão sem ser admin, sem
    tocar no banco;
  - e-mails idempotentes, CSV, painel, medição e cabeçalhos.
- e2e (desktop + celular): **23 passaram, 3 pulados** de propósito (dock só no celular; entrega local desligada). Inclui
  o teste do piloto com o carro revelando o texto e o novo `consulta-pedido.spec.ts`.
- `pnpm qa:varredura`: **sem alertas** (5 larguras × rotas padrão). Antes da correção, apontou que o campo de CEP
  (item 1b) alargava a página de produto em 360px; corrigido.
- `pnpm qa:marcadores`: 72 de 101 páginas com marcadores. São só os que dependem do responsável:
  - 66 produtos com "[CONFERIR COM O PRODUTO REAL]";
  - /contato, /envio, /faq, /politica-de-privacidade, /termos-de-uso e /trocas-e-devolucoes com
    "[CONTEÚDO A SER REDIGIDO]" ou "[DATA]".
- O teste de autorização achou um problema real, já corrigido: o importador de produtos engolia o redirecionamento ao
  login. Não houve vazamento: o banco não era tocado.

## O que não pôde ser testado

- **Supabase real:** as migrações foram testadas só no PGlite (Postgres em memória). Isso inclui o
  `atualizacao-2.sql` e o `setup-completo.sql`, rodados duas vezes. Também não foram testados RLS, painel logado e a troca
  para a secret key nova.
- **Resend:** só modelos e chamada HTTP simulada. O SMTP do Supabase também não foi testado.
- **Mercado Pago:** sem credenciais, como antes.
- **GA4 e Meta Pixel:** testados com IDs falsos (os scripts só carregam depois do "sim"); envio real de eventos não
  conferido.

## O que depende de você

1. Rodar `supabase/atualizacao-2.sql` no banco do Preview (**não** o setup completo: ele repõe produtos de teste e
   estoque). Depois, rodar `pnpm supabase:ativar` e o roteiro da seção 10 de `docs/lancamento.md`.
2. Configurar as chaves:
   - secret key nova do Supabase;
   - variáveis próprias em Production e novo deploy;
   - Site URL e Redirect URLs no Supabase Auth;
   - `RATE_LIMIT_SALT`.
3. Contas e domínio:
   - Resend com domínio verificado (`RESEND_API_KEY`, `EMAIL_FROM`);
   - SMTP do Supabase;
   - domínio próprio.
4. Configurações opcionais: número do WhatsApp; GA4/Meta Pixel. Se ligar GA4 ou Meta Pixel, a **Política de
   Privacidade precisa citar** essas ferramentas.
5. Backups: plano com backup diário ou `supabase db dump` semanal, mais os CSVs do painel.
6. Textos legais, fichas dos produtos, dados da empresa e licenças das fotos (incluindo carros sem logos e números).
7. Melhoria futura sugerida: Content-Security-Policy em modo relatório (`docs/backend/seguranca.md`).
