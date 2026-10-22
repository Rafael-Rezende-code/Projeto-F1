# Lançamento

## Indexação (Google e outros buscadores)

Até o lançamento o site fica **fora do índice** dos buscadores, mesmo publicado na Vercel. Controle por uma variável:
`NEXT_PUBLIC_ALLOW_INDEXING` (código em `lib/indexing.ts`).

| | Variável ausente ou diferente de `true` (hoje) | `NEXT_PUBLIC_ALLOW_INDEXING=true` |
| --- | --- | --- |
| `/robots.txt` | `Disallow: /` (tudo bloqueado), sem sitemap | Libera o site; bloqueia só `/carrinho`, `/checkout`, `/pedido/`, `/admin`; aponta o sitemap |
| Meta robots | `noindex, nofollow` em **todas** as páginas | `index, follow` (sacola, checkout, pedido e favoritos: `noindex, follow`; admin sempre `noindex, nofollow`) |
| Cabeçalho `X-Robots-Tag` | `noindex, nofollow` em todas as respostas (páginas, imagens, arquivos) | Ausente (exceto no `/admin`) |
| `/sitemap.xml` | Vazio | Todas as páginas públicas |

### No dia do lançamento

1. Vercel → projeto → **Settings → Environment Variables** → adicione `NEXT_PUBLIC_ALLOW_INDEXING` = `true` no ambiente
   **Production** (deixe **Preview** sem ela, para as prévias nunca serem indexadas).
2. Confira também `NEXT_PUBLIC_SITE_URL` = o domínio definitivo (ex.: `https://www.sua-loja.com.br`): é o endereço que
   vai no sitemap e nos links canônicos.
3. **Faça um novo deploy** (Deployments → ⋯ → Redeploy). A variável é lida no build; sem deploy novo nada muda.
4. Confira: `https://seu-dominio/robots.txt` deve mostrar `Allow: /` e a linha `Sitemap:`; o código-fonte de uma página
   de produto deve ter `<meta name="robots" content="index, follow"/>`.
5. Opcional: cadastre o domínio no Google Search Console e envie `https://seu-dominio/sitemap.xml`.
