// MARCA — o nome da loja (provisório) num lugar só. Trocar aqui atualiza cabeçalho, rodapé, metadata, Open Graph,
// favicon/apple-icon (gerados por next/og a partir do nome), cartão decorativo e textos institucionais.
// Quando houver logo definitiva, troque também app/icon.tsx, app/apple-icon.tsx e app/opengraph-image.tsx.
export const BRAND = {
  /** Nome da marca */
  name: "Apex",
  /** Ponto final do logotipo (detalhe em laranja) */
  mark: ".",
  /** Assinatura curta (título padrão das páginas) */
  tagline: "Feita para pilotos",
  /** Descrição padrão (metadata) */
  description: "Roupas, acessórios e colecionáveis premium de Fórmula 1.",
  /** Cores de destaque: laranja sobre fundo claro (contraste AA) e sobre fundo escuro */
  accent: "#b94f01",
  accentOnDark: "#e8702a",
} as const;

/** "Apex — Feita para pilotos" */
export const brandTitle = `${BRAND.name} — ${BRAND.tagline}`;
