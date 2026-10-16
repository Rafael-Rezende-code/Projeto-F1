# Próximos passos (refinamento visual, rodada 2)

Passada feita em 15/10/2026 no build de produção, nas larguras 1440, 1280, 820, 390 e 360px, nas páginas home,
equipes, piloto (Hamilton), produto (Scuderia Racing Jacket), favoritos, busca, sacola, checkout e 404.
Sem scroll horizontal e sem erros no console em nenhuma combinação. Prints em `docs/refino/`.

## Situação em 16/10/2026 (branch feat/pilotos)

Aprovadas pelo dono e aplicadas: 6 (barra fixa), 7 (esgotado), 9 (Mais desejados), 11 (produto em telas grandes),
12 (rodapé em acordeões), 13 (404), 14 (logos), 15 (Ver todos os resultados), 16 (Cadillac em largura total),
17 (seletor da VELOCIDADE) e 18 (script de varredura, agora em `scripts/qa/varredura.mjs`). A 10 (retrato do piloto
no celular) foi resolvida pelas fotos novas (altura controlada) e a 19 (hero menor no celular) na feat/ajustes.
Pendente: 8 (texto do hero no celular; o dono pediu para não mexer no texto do hero).

Notado nesta rodada (não aplicado): nos cards de equipe estreitos (tablet, ~820px), as logos de várias linhas
(Cadillac, Williams, Revolut) encostam na pílula "VER COLEÇÃO".

## Implementadas na rodada 2 (alto impacto, baixo risco)

1. **Hero: legibilidade dos textos sobre a foto.** Gradiente inferior (preto 70% → transparente no celular, 55% no
   desktop) acima da camada do spotlight (que, antes do primeiro movimento do mouse, cobre tudo abaixo de z-30, inclusive
   o gradiente original). Parágrafo do CTA de 80% para 90% de branco.
2. **Busca no celular: placeholder cortado** ("pilotos" virava "pilc"). Campo com 16px abaixo de 640px (também evita o
   zoom automático do iOS) e 18px acima.
3. **Busca vazia: categorias como atalho**, além de equipes e pilotos (a ação `searchSuggestions` passou a devolvê-las).
4. **Estados vazios (sacola, favoritos, checkout):** botão "Ver a coleção" com alvo de toque de 44px e texto de 14px
   (era 12px e ~40px de altura).
5. **"Filtrar no catálogo" (equipe e piloto)** parecia texto solto: ganhou seta, sublinhado no hover e alvo de 44px.

## Pendentes, por prioridade

| # | Melhoria | Impacto | Risco | Observação |
| --- | --- | --- | --- | --- |
| 6 | Produto (celular): a barra de compra fixa aparece logo ao carregar, porque o botão principal começa fora da tela. Mostrar só depois de o visitante passar pelo botão. | Alto | Baixo | `IntersectionObserver` no botão principal. |
| 7 | Produto: tamanho esgotado só tem o risco e contraste muito baixo. Mostrar "esgotado" visível (e manter o `aria-disabled`). | Alto | Baixo | Afeta conversão e acessibilidade. |
| 8 | Hero (celular): o parágrafo ainda fica sobre a parte mais ruidosa do carro. Encurtar o texto no celular ou subir o bloco. | Médio | Médio | Mexe em conteúdo/posição: decisão do dono. |
| 9 | Sacola e favoritos vazios: o rodapé sobe logo depois do aviso. Mostrar "Mais desejados" abaixo do estado vazio. | Médio | Baixo | Reaproveita `ProductCard`. |
| 10 | Piloto (celular): o retrato ocupa uma tela inteira antes dos produtos. Reduzir a proporção no celular. | Médio | Baixo | Conferir o recorte de cada foto. |
| 11 | Produto (desktop 1440): a coluna de informações fica pequena perto da imagem. Aumentar preço, tamanhos e botão em `xl`. | Médio | Baixo | |
| 12 | Rodapé (celular): três listas longas em sequência. Agrupar em acordeões (`<details>`). | Médio | Médio | Manter links rastreáveis (SEO). |
| 13 | 404 (celular): o "404" vazado passa atrás do parágrafo. Centralizar o número atrás do título. | Baixo | Baixo | |
| 14 | Faixa de equipes (celular): Cadillac e Mercedes ficam pequenas e claras. Revisar `displayHeight` delas. | Baixo | Baixo | `lib/f1-teams.ts`. |
| 15 | Busca: link "Ver todos os resultados" para a listagem filtrada. | Médio | Médio | Exige filtro de texto em `/produtos` (`?q=`). |
| 16 | Equipes (celular): a Cadillac fica sozinha centralizada na última linha. Avaliar card de largura total. | Baixo | Baixo | Grade aprovada: só com aval do dono. |
| 17 | GlyphPortal: o seletor "Escolha uma letra" do componente aparece no estado estático. | Baixo | Médio | Componente de terceiro (não alterar a lógica); só via CSS externo. |
| 19 | Desempenho da home: mediana ~87 no Lighthouse mobile (meta 90). Servir o hero do celular menor (AVIF via next/image ou image-set) para baixar o LCP no modo lento. | Alto | Médio | O hero usa background-image + spotlight: testar sem mudar o visual. |
| 18 | Varredura automática: "Luzes apagadas." (1440/1280) e "Lewis Hamilton" (390/360) aparecem como títulos encostados na borda, mas são falsos positivos (o `h2` oculto do celular e a folga da assinatura). Ajustar o script. | Baixo | Baixo | Conferido por medição e print. |
