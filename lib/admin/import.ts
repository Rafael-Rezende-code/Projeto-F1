import { slugify } from "./product-schema";

// Importador de produtos por CSV (lançamento, item 3). Parte PURA, sem banco nem rede (testes em import.test.ts):
// lê o CSV (vírgula ou ponto e vírgula, aspas, BOM do Excel), normaliza os cabeçalhos (acentos, maiúsculas, apelidos),
// converte dinheiro brasileiro ("R$ 1.299,90"), tamanhos e estoque ("P:3 | M:5"), e valida cada linha contra as
// categorias/equipes/pilotos do banco e os produtos que já existem (slug existente = ATUALIZAÇÃO).
// Custo, frete do fornecedor, link do fornecedor e notas vão em `secret` → tabela privada product_private.

export const IMPORT_COLUMNS = [
  { key: "nome", label: "nome", required: true, help: "Nome do produto" },
  { key: "slug", label: "slug", required: false, help: "Endereço (opcional; gerado do nome). Slug que já existe = atualiza o produto" },
  { key: "descricao", label: "descricao", required: true, help: "Descrição; parágrafos separados por linha em branco (use aspas)" },
  { key: "categoria", label: "categoria", required: true, help: "Slug ou nome da categoria" },
  { key: "equipe", label: "equipe", required: false, help: "Slug ou nome da equipe" },
  { key: "piloto", label: "piloto", required: false, help: "Slug ou nome do piloto" },
  { key: "preco", label: "preco", required: true, help: "Preço de venda (ex.: R$ 1.299,90)" },
  { key: "preco_de", label: "preco_de", required: false, help: "Preço \"de\" (riscado), maior que o preço" },
  { key: "tamanhos_estoque", label: "tamanhos_estoque", required: true, help: "Tamanho:estoque separados por | (ex.: P:3 | M:5 | G:0) ou Único:10" },
  { key: "fulfillment", label: "fulfillment", required: false, help: "estoque_proprio (padrão) ou sob_encomenda" },
  { key: "prazo_min", label: "prazo_min", required: false, help: "Dias úteis até o envio (mínimo; padrão 1)" },
  { key: "prazo_max", label: "prazo_max", required: false, help: "Dias úteis até o envio (máximo; padrão 3)" },
  { key: "origem", label: "origem", required: false, help: "nacional (padrão) ou importado" },
  { key: "peso_g", label: "peso_g", required: false, help: "Peso da embalagem em gramas (padrão 400)" },
  { key: "comprimento_cm", label: "comprimento_cm", required: false, help: "Embalagem (padrão 30)" },
  { key: "largura_cm", label: "largura_cm", required: false, help: "Embalagem (padrão 25)" },
  { key: "altura_cm", label: "altura_cm", required: false, help: "Embalagem (padrão 5)" },
  { key: "custo", label: "custo", required: false, help: "PRIVADO: custo do produto" },
  { key: "frete_fornecedor", label: "frete_fornecedor", required: false, help: "PRIVADO: frete pago ao fornecedor" },
  { key: "link_fornecedor", label: "link_fornecedor", required: false, help: "PRIVADO: link do produto no fornecedor" },
  { key: "notas", label: "notas", required: false, help: "PRIVADO: notas internas" },
  { key: "imagens", label: "imagens", required: false, help: "URLs das fotos (https), separadas por | ; a primeira é a principal" },
  { key: "tags", label: "tags", required: false, help: "Palavras para a busca, separadas por vírgula" },
  { key: "status", label: "status", required: false, help: "publicado (padrão) ou rascunho" },
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number]["key"];

/** Apelidos aceitos nos cabeçalhos (já normalizados: minúsculas, sem acento, "_" no lugar de espaços). */
const ALIASES: Record<string, ImportColumn> = {
  produto: "nome", name: "nome", description: "descricao", category: "categoria", time: "equipe", team: "equipe",
  driver: "piloto", preco_de_venda: "preco", preco_venda: "preco", price: "preco", preco_de_riscado: "preco_de", preco_anterior: "preco_de",
  tamanhos: "tamanhos_estoque", tamanhos_e_estoque: "tamanhos_estoque", estoque: "tamanhos_estoque", modelo: "fulfillment", modelo_de_venda: "fulfillment",
  prazo_minimo: "prazo_min", prazo_maximo: "prazo_max", peso: "peso_g", peso_gramas: "peso_g", comprimento: "comprimento_cm", largura: "largura_cm",
  altura: "altura_cm", custo_do_produto: "custo", frete_do_fornecedor: "frete_fornecedor", fornecedor: "link_fornecedor", url_fornecedor: "link_fornecedor", link_do_fornecedor: "link_fornecedor", url_do_fornecedor: "link_fornecedor",
  notas_internas: "notas", fotos: "imagens", urls_das_imagens: "imagens", imagem: "imagens",
};

export const normalizeKey = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/["'()]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

export function headerKey(header: string): ImportColumn | null {
  const key = normalizeKey(header);
  if (IMPORT_COLUMNS.some((column) => column.key === key)) return key as ImportColumn;
  return ALIASES[key] ?? null;
}

/** CSV (RFC 4180): aspas, aspas duplicadas, quebras de linha dentro de aspas, BOM; separador , ou ; (detectado). */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, "");
  const firstLine = source.slice(0, source.search(/\r?\n|$/));
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) && firstLine.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/**
 * Dinheiro em CENTAVOS. Aceita "R$ 1.299,90", "1299,9", "1.299", "1299.90", "59". Vírgula presente = formato
 * brasileiro (ponto é milhar). Sem vírgula: "1.299" (grupos de 3) é milhar; "59.9" é decimal. Vazio → null; inválido → NaN.
 */
export function parseMoney(value: string): number | null {
  const clean = value.replace(/R\$|\s| /gi, "");
  if (!clean) return null;
  let normalized: string;
  if (clean.includes(",")) normalized = clean.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) normalized = clean.replace(/\./g, "");
  else normalized = clean;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Math.round(Number(normalized) * 100);
}

/** Número inteiro ou decimal com vírgula ("2,5"). Vazio → null; inválido → NaN. */
export function parseNumber(value: string): number | null {
  const clean = value.trim().replace(",", ".");
  if (!clean) return null;
  return /^\d+(\.\d+)?$/.test(clean) ? Number(clean) : NaN;
}

/** "P:3 | M:5 | G:0" ou "Único:10" (também "P=3", ";" ou "/" no lugar de "|"). Sem número = estoque 0. */
export function parseSizes(value: string): { size: string; stock: number }[] | null {
  const parts = value.split(/[|/\n]/).map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const sizes: { size: string; stock: number }[] = [];
  for (const part of parts) {
    const match = part.match(/^(.+?)\s*[:=]\s*(\d+)$/) ?? (/[:=]/.test(part) ? null : part.match(/^(.+)$/));
    if (!match) return null;
    const size = match[1].trim();
    const stock = match[2] === undefined ? 0 : Number(match[2]);
    if (!size || size.length > 20) return null;
    sizes.push({ size: /^unico$/i.test(normalizeKey(size)) ? "Único" : size, stock });
  }
  return sizes;
}

const pick = <T extends string>(value: string, options: Record<string, T>, fallback: T): T | null => {
  const key = normalizeKey(value);
  if (!key) return fallback;
  return options[key] ?? null;
};

export type Option = { slug: string; name: string };
export type ImportContext = {
  categories: Option[];
  teams: Option[];
  drivers: (Option & { team_slug?: string })[];
  /** Produtos que já existem, por slug (para atualizar e manter os SKUs). */
  existing: Map<string, { id: string; variants: { sku: string; size: string }[] }>;
  /** SKUs de outros produtos (não podem ser reutilizados). */
  skuOwners?: Map<string, string>;
};

export type ImportProduct = {
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
  teamSlug: string | null;
  driverSlug: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  variants: { sku: string; size: string; stock: number }[];
  fulfillment: "estoque_proprio" | "sob_encomenda";
  dispatchMin: number;
  dispatchMax: number;
  origin: "nacional" | "importado";
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  tags: string[];
  status: "active" | "draft";
  imageUrls: string[];
};

/** PRIVADO (product_private). `undefined` = célula vazia = não altera o que já existe. */
export type ImportSecret = { costCents?: number; supplierShippingCents?: number; supplierUrl?: string; notes?: string };

export type ImportRow =
  | { line: number; ok: true; action: "novo" | "atualizar"; product: ImportProduct; secret: ImportSecret; warnings: string[] }
  | { line: number; ok: false; name: string; errors: string[] };

const findOption = (options: Option[], value: string) => {
  const key = normalizeKey(value);
  return options.find((option) => normalizeKey(option.slug) === key || normalizeKey(option.name) === key) ?? null;
};

export const skuFor = (slug: string, size: string) =>
  `${slug}-${normalizeKey(size) || "un"}`.toUpperCase().replace(/_/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

/** Bloqueia endereços internos (o servidor não deve buscar a rede privada a pedido de uma planilha). */
export function isPublicHttpUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return false;
  return true;
}

/** Lê o CSV inteiro e valida cada linha. Erro de cabeçalho → `headerErrors` (nenhuma linha é lida). */
export function analyzeImport(text: string, context: ImportContext) {
  const table = parseCsv(text);
  if (table.length < 2) return { headerErrors: ["A planilha está vazia: precisa do cabeçalho e de pelo menos uma linha."], rows: [] as ImportRow[] };
  const headers = table[0].map(headerKey);
  const missing = IMPORT_COLUMNS.filter((column) => column.required && !headers.includes(column.key)).map((column) => column.key);
  const unknown = table[0].filter((_, index) => headers[index] === null && table[0][index].trim());
  const headerErrors = missing.length ? [`Faltam colunas obrigatórias: ${missing.join(", ")}.`] : [];
  if (headerErrors.length) return { headerErrors, unknownColumns: unknown, rows: [] as ImportRow[] };

  const seenSlugs = new Map<string, number>();
  const seenSkus = new Map<string, string>();
  const rows: ImportRow[] = table.slice(1).map((cells, index) => {
    const line = index + 2; // linha 1 é o cabeçalho
    const get = (key: ImportColumn) => {
      const position = headers.indexOf(key);
      return position >= 0 ? (cells[position] ?? "").trim() : "";
    };
    const errors: string[] = [];
    const warnings: string[] = [];
    const name = get("nome");
    if (name.length < 3) errors.push("Nome vazio ou curto demais.");
    const slug = slugify(get("slug") || name);
    if (!slug) errors.push("Slug inválido.");
    else if (seenSlugs.has(slug)) errors.push(`Slug "${slug}" repetido (já está na linha ${seenSlugs.get(slug)}).`);
    else seenSlugs.set(slug, line);
    const description = get("descricao").replace(/\r\n/g, "\n");
    if (description.length < 10) errors.push("Descrição vazia ou curta demais (mínimo 10 caracteres).");

    const category = findOption(context.categories, get("categoria"));
    if (!category) errors.push(get("categoria") ? `Categoria "${get("categoria")}" não existe.` : "Categoria vazia.");
    const team = get("equipe") ? findOption(context.teams, get("equipe")) : null;
    if (get("equipe") && !team) errors.push(`Equipe "${get("equipe")}" não existe.`);
    const driver = get("piloto") ? findOption(context.drivers, get("piloto")) : null;
    if (get("piloto") && !driver) errors.push(`Piloto "${get("piloto")}" não existe.`);

    const price = parseMoney(get("preco"));
    if (price === null || Number.isNaN(price) || price <= 0) errors.push(get("preco") ? `Preço "${get("preco")}" inválido.` : "Preço vazio.");
    const compare = parseMoney(get("preco_de"));
    if (Number.isNaN(compare)) errors.push(`Preço "de" "${get("preco_de")}" inválido.`);
    else if (compare !== null && price && !Number.isNaN(price) && compare <= price) errors.push("O preço \"de\" precisa ser maior que o preço.");

    const sizes = parseSizes(get("tamanhos_estoque"));
    if (!sizes) errors.push(get("tamanhos_estoque") ? `Tamanhos "${get("tamanhos_estoque")}" inválidos (use P:3 | M:5).` : "Tamanhos e estoque vazios (ex.: Único:10).");
    else if (new Set(sizes.map((item) => normalizeKey(item.size))).size !== sizes.length) errors.push("Tamanho repetido.");

    const fulfillment = pick(get("fulfillment"), { estoque_proprio: "estoque_proprio", estoque: "estoque_proprio", pronta_entrega: "estoque_proprio", sob_encomenda: "sob_encomenda", encomenda: "sob_encomenda" } as const, "estoque_proprio");
    if (!fulfillment) errors.push(`Fulfillment "${get("fulfillment")}" inválido (estoque_proprio ou sob_encomenda).`);
    const origin = pick(get("origem"), { nacional: "nacional", importado: "importado", importada: "importado" } as const, "nacional");
    if (!origin) errors.push(`Origem "${get("origem")}" inválida (nacional ou importado).`);

    const number = (key: ImportColumn, fallback: number, label: string, integer = false) => {
      const value = parseNumber(get(key));
      if (value === null) return fallback;
      if (Number.isNaN(value) || value < 0 || (integer && !Number.isInteger(value))) {
        errors.push(`${label} "${get(key)}" inválido.`);
        return fallback;
      }
      return value;
    };
    const dispatchMin = number("prazo_min", 1, "Prazo mínimo", true);
    const dispatchMax = number("prazo_max", Math.max(3, dispatchMin), "Prazo máximo", true);
    if (dispatchMax < dispatchMin) errors.push("Prazo máximo menor que o mínimo.");
    if (dispatchMax > 120) errors.push("Prazo máximo acima de 120 dias úteis.");
    const weightGrams = number("peso_g", 400, "Peso", true);
    const lengthCm = number("comprimento_cm", 30, "Comprimento");
    const widthCm = number("largura_cm", 25, "Largura");
    const heightCm = number("altura_cm", 5, "Altura");
    if (!get("peso_g")) warnings.push("Sem peso: usado 400 g (o frete pode sair errado).");
    if (fulfillment === "sob_encomenda" && !get("prazo_max")) warnings.push("Sob encomenda sem prazo máximo: usado o padrão (3 dias úteis).");

    const cost = parseMoney(get("custo"));
    if (Number.isNaN(cost)) errors.push(`Custo "${get("custo")}" inválido.`);
    const supplierShipping = parseMoney(get("frete_fornecedor"));
    if (Number.isNaN(supplierShipping)) errors.push(`Frete do fornecedor "${get("frete_fornecedor")}" inválido.`);
    const supplierUrl = get("link_fornecedor");
    if (supplierUrl && !isHttpUrl(supplierUrl)) errors.push("Link do fornecedor inválido (comece com https://).");

    const imageUrls = get("imagens").split(/[|\s]+/).map((url) => url.trim()).filter(Boolean);
    const badImage = imageUrls.find((url) => !isHttpUrl(url));
    if (badImage) errors.push(`URL de imagem inválida: ${badImage.slice(0, 60)}`);
    if (imageUrls.length > 12) errors.push("Mais de 12 imagens.");

    const status = pick(get("status"), { publicado: "active", ativo: "active", active: "active", rascunho: "draft", draft: "draft" } as const, "active");
    if (!status) errors.push(`Status "${get("status")}" inválido (publicado ou rascunho).`);

    const existing = context.existing.get(slug);
    if (!existing && status === "active" && !imageUrls.length) warnings.push("Sem imagens: entra como rascunho.");

    // SKUs: mantém os do produto existente (mesmo tamanho); senão, gera SLUG-TAMANHO.
    const variants = (sizes ?? []).map((item) => {
      const sku = existing?.variants.find((variant) => normalizeKey(variant.size) === normalizeKey(item.size))?.sku ?? skuFor(slug, item.size);
      return { sku, size: item.size, stock: item.stock };
    });
    for (const variant of variants) {
      const owner = context.skuOwners?.get(variant.sku);
      if (owner && owner !== slug) errors.push(`O SKU ${variant.sku} já é do produto "${owner}".`);
      if (seenSkus.has(variant.sku) && seenSkus.get(variant.sku) !== slug) errors.push(`SKU ${variant.sku} repetido na planilha.`);
      seenSkus.set(variant.sku, slug);
    }

    if (errors.length) return { line, ok: false, name: name || `(linha ${line})`, errors };
    return {
      line,
      ok: true,
      action: existing ? "atualizar" : "novo",
      warnings,
      product: {
        slug,
        name,
        description,
        categorySlug: category!.slug,
        teamSlug: team?.slug ?? ((driver as { team_slug?: string } | null)?.team_slug ?? null),
        driverSlug: driver?.slug ?? null,
        priceCents: price!,
        compareAtPriceCents: compare,
        variants,
        fulfillment: fulfillment!,
        dispatchMin,
        dispatchMax,
        origin: origin!,
        weightGrams,
        lengthCm,
        widthCm,
        heightCm,
        tags: get("tags").split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean),
        status: status === "active" && !existing && !imageUrls.length ? "draft" : status!,
        imageUrls,
      },
      secret: {
        costCents: cost ?? undefined,
        supplierShippingCents: supplierShipping ?? undefined,
        supplierUrl: supplierUrl || undefined,
        notes: get("notas") || undefined,
      },
    };
  });
  return { headerErrors: [] as string[], unknownColumns: unknown, rows };
}

/** Modelo para download (separador ";" e BOM: abre certo no Excel em português). */
export function importTemplate() {
  const header = IMPORT_COLUMNS.map((column) => column.label);
  const examples = [
    ["Camiseta Exemplo Ferrari", "", "Camiseta de algodão com estampa frontal.\n\nSegundo parágrafo da descrição.", "teamwear", "ferrari", "", "R$ 199,90", "R$ 249,90", "P:5 | M:8 | G:6 | GG:2", "estoque_proprio", "1", "2", "nacional", "250", "30", "25", "3", "R$ 62,00", "", "", "", "https://images.unsplash.com/photo-xxxxx", "camiseta, ferrari", "publicado"],
    ["Miniatura Exemplo 1:43", "miniatura-exemplo-143", "Miniatura em escala 1:43 com base expositora.", "colecionaveis", "", "hamilton", "R$ 1.299,90", "", "Único:3", "sob_encomenda", "15", "30", "importado", "900", "20", "20", "20", "R$ 640,00", "R$ 55,00", "https://fornecedor.exemplo/produto/123", "Pedir com caixa original", "", "miniatura", "rascunho"],
  ];
  const quote = (cell: string) => (/[;"\n,]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
  return "﻿" + [header, ...examples].map((row) => row.map(quote).join(";")).join("\r\n") + "\r\n";
}
