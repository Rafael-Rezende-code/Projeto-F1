# Home: nova ordem (refino 3, item 1.1)

## Antes (feat/carros)

1. Hero ("Feita para pilotos")
2. Pilotos ("Escolha seu piloto")
3. Faixa de equipes
4. Categorias ("Feita em torno da corrida.", 4 cards de categoria)
5. **Essenciais do dia de prova** (4 produtos fixos)
6. Manifesto ("Mais que uma corrida.")
7. Equipes ("Com quem você corre?")
8. "Cada detalhe importa."
9. **O que o grid veste** (carrossel de 5 produtos fixos: 3 deles repetiam os Essenciais)
10. VELOCIDADE (3 destaques; um deles repetia os Essenciais)
11. "Luzes apagadas." (#journal, com o link do Diário)
12. Newsletter

Primeiro produto: y ≈ 2968 px no desktop 1440×900 (3,3 telas depois do hero).

## Depois

1. Hero (tipografia e conteúdo intactos)
2. **Faixa de benefícios** (só aparece com algo configurado em `lib/store-policy.ts`; hoje, nada configurado = não aparece)
3. Pilotos
4. Faixa de equipes
5. **Mais vendidos** (#mais-vendidos): 8 produtos (curadoria manual → vendas reais dos últimos 90 dias → destaques; nunca vazia)
6. **Coleções** (#collection, "Feita em torno da corrida."): as coleções com produto (hoje camisetas, miniaturas, colecionáveis,
   acessórios) + "Ver todas as coleções"
7. **Novidades** (#novidades): até 4 com o selo NOVO, sem os que já estão em Mais vendidos
8. Manifesto ("Mais que uma corrida.")
9. Equipes ("Com quem você corre?")
10. "Cada detalhe importa." (mantida: é conteúdo editorial, não vitrine)
11. **Presentes** (#presentes): 4 cards por faixa de preço, com a contagem real, levando a `/presentes?faixa=`
12. VELOCIDADE (destaques que ainda não apareceram nas vitrines acima)
13. Diário ("Luzes apagadas." + "Ler o Diário")
14. Newsletter (#newsletter, alvo do "Em breve" das coleções vazias)

Primeiro produto: y ≈ 2017 px no desktop 1440×900 (1,24 tela depois do hero) e y ≈ 1836 px no celular 390×844
(1,2 tela depois do hero).

## Por quê

- **Produto até a segunda tela.** A ordem de partida (coleções antes de Mais vendidos) deixava o primeiro produto em
  y ≈ 2968 no desktop, fora das duas telas depois do hero (900 + 1800 = 2700). Com Mais vendidos logo depois da faixa de
  equipes, a primeira fileira de produtos aparece na segunda tela no desktop e no celular, e as coleções vêm logo em seguida
  como "outra porta de entrada".
- **Sem vitrines repetidas.** "Essenciais do dia de prova" e "O que o grid veste" eram listas fixas que se repetiam (e
  repetiam a VELOCIDADE). Agora cada produto aparece numa vitrine só: Mais vendidos → Novidades (exclui os já mostrados) →
  VELOCIDADE (prefere destaques ainda não mostrados). "O que o grid veste" virou o rótulo da seção Mais vendidos.
- **Do mais provável ao mais editorial.** Comprar (Mais vendidos, coleções, novidades) antes de contar história (manifesto,
  equipes, detalhe), com Presentes como atalho de decisão perto do fim e o Diário/newsletter fechando.
- **Destaques laranjas (HighlightedText):** ficaram 2 ("corrida" e "detalhe"); o "grid" saiu junto com o carrossel.
- A home passou a ter `revalidate = 3600` (ISR de 1 hora) para "Mais vendidos" refletir as vendas reais com o Supabase. Com
  o seed, nada muda.

Prints da página inteira em `docs/refino-3/home/antes/` e `docs/refino-3/home/depois/` (desktop 1440 e celular 390).
