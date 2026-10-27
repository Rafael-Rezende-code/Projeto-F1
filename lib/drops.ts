// Drops e pré-venda (loja extra, item 6): regras puras (testes em drops.test.ts). A mesma liberação é conferida no
// banco (create_order, numa transação): antes da data de lançamento (horário de Brasília) o produto do drop NÃO é
// vendável; depois, abre sozinho. Pré-venda: vende com selo e "Envio previsto", com o estoque como teto. Limite por
// pedido: soma das peças do mesmo drop no pedido.

export type DropMode = "lancamento" | "pre_venda";
export type Drop = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover?: string | null;
  /** Lançamento (ISO; digitado em horário de Brasília no painel). */
  launchAt: string;
  mode: DropMode;
  /** Texto livre da previsão de envio (pré-venda), ex.: "a partir de 15/12". */
  shipEstimate?: string | null;
  /** Máximo de peças do drop por pedido (null = sem limite). */
  perOrderLimit?: number | null;
  productSlugs: string[];
  active: boolean;
};

/** Resumo que viaja com o produto (página, card, sacola). */
export type ProductDrop = Pick<Drop, "slug" | "title" | "launchAt" | "mode" | "shipEstimate" | "perOrderLimit"> & {
  /** Já lançado quando o servidor montou os dados (o navegador confere de novo pelo relógio). */
  released: boolean;
};

export const isReleased = (drop: Pick<Drop, "launchAt">, now: number) => now >= new Date(drop.launchAt).getTime();

/** Drop ativo que contém o produto (o de lançamento mais recente, se houver mais de um). */
export function dropForProduct(drops: Drop[], slug: string): Drop | null {
  return drops.filter((drop) => drop.active && drop.productSlugs.includes(slug)).sort((a, b) => b.launchAt.localeCompare(a.launchAt))[0] ?? null;
}

export const productDrop = (drop: Drop | null, now = Date.now()): ProductDrop | undefined =>
  drop ? { slug: drop.slug, title: drop.title, launchAt: drop.launchAt, mode: drop.mode, shipEstimate: drop.shipEstimate ?? null, perOrderLimit: drop.perOrderLimit ?? null, released: isReleased(drop, now) } : undefined;

/** Drops para a vitrine: futuros e lançados há até 30 dias (ativos), o mais próximo primeiro. */
export function visibleDrops(drops: Drop[], now: number) {
  const recent = 30 * 24 * 3_600_000;
  return drops
    .filter((drop) => drop.active && new Date(drop.launchAt).getTime() > now - recent)
    .sort((a, b) => a.launchAt.localeCompare(b.launchAt));
}

export type DropIssue = { kind: "nao_liberado"; slug: string; drop: string; launchAt: string } | { kind: "limite"; drop: string; limit: number };

/** Itens do pedido contra os drops: produto antes do lançamento, ou peças do mesmo drop acima do limite. */
export function dropIssues(lines: { slug: string; quantity: number }[], drops: Drop[], now: number): DropIssue[] {
  const issues: DropIssue[] = [];
  const perDrop = new Map<string, { drop: Drop; quantity: number }>();
  for (const line of lines) {
    const drop = dropForProduct(drops, line.slug);
    if (!drop) continue;
    if (!isReleased(drop, now)) {
      if (!issues.some((issue) => issue.kind === "nao_liberado" && issue.slug === line.slug)) issues.push({ kind: "nao_liberado", slug: line.slug, drop: drop.title, launchAt: drop.launchAt });
      continue;
    }
    const entry = perDrop.get(drop.slug) ?? { drop, quantity: 0 };
    entry.quantity += line.quantity;
    perDrop.set(drop.slug, entry);
  }
  for (const { drop, quantity } of perDrop.values()) if (drop.perOrderLimit && quantity > drop.perOrderLimit) issues.push({ kind: "limite", drop: drop.title, limit: drop.perOrderLimit });
  return issues;
}

export function dropIssueMessage(issue: DropIssue) {
  if (issue.kind === "limite") return `${issue.drop}: no máximo ${issue.limit} ${issue.limit === 1 ? "peça" : "peças"} por pedido. Ajuste a sacola.`;
  return `${issue.drop} ainda não foi lançado. Tire a peça da sacola ou volte depois do lançamento.`;
}

/** "sexta, 14/11, 20:00" em Brasília. */
export const launchLabel = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)).replace(" às ", ", ");

type DropRow = { id: string; slug: string; title: string; description: string; cover: string | null; launch_at: string; mode: DropMode; ship_estimate: string | null; per_order_limit: number | null; product_slugs: string[] | null; active: boolean };
export const dropFromRow = (row: DropRow): Drop => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description,
  cover: row.cover,
  launchAt: row.launch_at,
  mode: row.mode,
  shipEstimate: row.ship_estimate,
  perOrderLimit: row.per_order_limit,
  productSlugs: row.product_slugs ?? [],
  active: row.active,
});

/** Produtos com o resumo do drop a que pertencem (selo "Em breve"/"Pré-venda" no card e na página). */
export function attachDrops<T extends { slug: string }>(products: T[], drops: Drop[]): (T & { drop?: ProductDrop })[] {
  if (!drops.some((drop) => drop.active)) return products;
  return products.map((product) => {
    const drop = productDrop(dropForProduct(drops, product.slug));
    return drop ? { ...product, drop } : product;
  });
}
