import { describe, expect, it } from "vitest";
import { analyzeImport, headerKey, importTemplate, isPublicHttpUrl, parseCsv, parseDate, parseMoney, parseSizes, parseYesNo, type ImportContext } from "./import";

const context: ImportContext = {
  categories: [{ slug: "teamwear", name: "Teamwear" }, { slug: "colecionaveis", name: "Colecionáveis" }],
  teams: [{ slug: "ferrari", name: "Ferrari" }, { slug: "mclaren", name: "McLaren" }],
  drivers: [{ slug: "hamilton", name: "Lewis Hamilton", team_slug: "ferrari" }],
  existing: new Map([["camiseta-ferrari", { id: "uuid-1", variants: [{ sku: "APX-010-M", size: "M" }] }]]),
  skuOwners: new Map([["APX-010-M", "camiseta-ferrari"], ["OUTRO-UN", "outro-produto"]]),
};
const HEADER = "nome;slug;descrição;categoria;equipe;piloto;preço de venda;preço de;tamanhos e estoque;fulfillment;prazo mín.;prazo máx.;origem;peso (g);custo;link do fornecedor;imagens";

describe("importador CSV: leitura", () => {
  it("dinheiro brasileiro", () => {
    expect(parseMoney("R$ 1.299,90")).toBe(129990);
    expect(parseMoney("1299,9")).toBe(129990);
    expect(parseMoney("1.299")).toBe(129900);
    expect(parseMoney("59.90")).toBe(5990);
    expect(parseMoney("R$ 89")).toBe(8900);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("12,3,4")).toBeNaN();
    expect(parseMoney("abc")).toBeNaN();
  });

  it("CSV com ponto e vírgula, aspas, quebra de linha dentro de aspas e BOM", () => {
    const rows = parseCsv('﻿nome;descricao\r\n"Boné ""Pit Lane""";"Linha 1\n\nLinha 2"\r\n;\r\n');
    expect(rows).toEqual([["nome", "descricao"], ['Boné "Pit Lane"', "Linha 1\n\nLinha 2"]]);
    expect(parseCsv("a,b\n1,\"2,5\"")).toEqual([["a", "b"], ["1", "2,5"]]);
  });

  it("cabeçalhos com acento, maiúsculas e apelidos", () => {
    expect(headerKey("Descrição")).toBe("descricao");
    expect(headerKey("Preço de venda")).toBe("preco");
    expect(headerKey("PRAZO MÍN.")).toBe("prazo_min");
    expect(headerKey("Peso (g)")).toBe("peso_g");
    expect(headerKey("coluna estranha")).toBeNull();
  });

  it("tamanhos e estoque", () => {
    expect(parseSizes("P:3 | M:5 | GG:0")).toEqual([{ size: "P", stock: 3 }, { size: "M", stock: 5 }, { size: "GG", stock: 0 }]);
    expect(parseSizes("unico=10")).toEqual([{ size: "Único", stock: 10 }]);
    expect(parseSizes("P:abc")).toBeNull();
    expect(parseSizes("")).toBeNull();
  });
});

describe("importador CSV: validação", () => {
  it("novo, atualização (slug existente mantém o SKU) e dados privados separados", () => {
    const csv = [
      HEADER,
      'Miniatura Hamilton;;"Miniatura em escala 1:43, com base.";Colecionáveis;;Lewis Hamilton;R$ 1.299,90;;Único:3;sob encomenda;15;30;Importado;900;R$ 640,00;https://fornecedor.exemplo/p/1;https://img.exemplo/a.jpg | https://img.exemplo/b.jpg',
      "Camiseta Ferrari;camiseta-ferrari;Camiseta de algodão da equipe.;teamwear;ferrari;;199,90;249,90;M:4 | G:2;;;;;250;;;https://img.exemplo/c.jpg",
    ].join("\n");
    const { rows, headerErrors } = analyzeImport(csv, context);
    expect(headerErrors).toEqual([]);
    const [mini, shirt] = rows;
    expect(mini).toMatchObject({ ok: true, action: "novo", product: { slug: "miniatura-hamilton", priceCents: 129990, fulfillment: "sob_encomenda", origin: "importado", dispatchMin: 15, dispatchMax: 30, driverSlug: "hamilton", teamSlug: "ferrari", categorySlug: "colecionaveis", status: "active", imageUrls: ["https://img.exemplo/a.jpg", "https://img.exemplo/b.jpg"] }, secret: { costCents: 64000, supplierUrl: "https://fornecedor.exemplo/p/1" } });
    expect(shirt).toMatchObject({ ok: true, action: "atualizar", product: { compareAtPriceCents: 24990, fulfillment: "estoque_proprio", variants: [{ sku: "APX-010-M", size: "M", stock: 4 }, { sku: "CAMISETA-FERRARI-G", size: "G", stock: 2 }] } });
    if (mini.ok) expect(mini.product).not.toHaveProperty("costCents");
  });

  it("linhas incompletas ou erradas viram erro com o motivo", () => {
    const csv = [
      HEADER,
      "Bo;;curta;inexistente;;;abc;;;;;;;;;;",
      "Caneca;;Caneca de cerâmica 325 ml.;colecionaveis;;;R$ 89,90;R$ 50,00;Único:10;;5;2;lunar;;x;ftp://x;",
      "Faltando colunas",
    ].join("\n");
    const { rows } = analyzeImport(csv, context);
    expect(rows.every((row) => !row.ok)).toBe(true);
    const messages = rows.map((row) => (row.ok ? [] : row.errors).join(" | "));
    expect(messages[0]).toMatch(/Nome vazio ou curto/);
    expect(messages[0]).toMatch(/Categoria "inexistente" não existe/);
    expect(messages[0]).toMatch(/Preço "abc" inválido/);
    expect(messages[1]).toMatch(/preço "de" precisa ser maior/);
    expect(messages[1]).toMatch(/Prazo máximo menor/);
    expect(messages[1]).toMatch(/Origem "lunar"/);
    expect(messages[1]).toMatch(/Custo "x" inválido/);
    expect(messages[1]).toMatch(/Link do fornecedor inválido/);
    expect(messages[2]).toMatch(/Descrição vazia/);
    expect(rows[2].line).toBe(4);
  });

  it("sem coluna obrigatória: erro de cabeçalho; slug repetido e SKU de outro produto", () => {
    expect(analyzeImport("nome;preco\nX;1", context).headerErrors[0]).toMatch(/Faltam colunas obrigatórias: descricao, categoria, tamanhos_estoque/);
    const csv = [HEADER, "Outro Produto Novo;outro;Descrição longa o bastante.;teamwear;;;10;;UN:1;;;;;;;;", "Outro Produto Novo;outro;Descrição longa o bastante.;teamwear;;;10;;P:1;;;;;;;;"].join("\n");
    const { rows } = analyzeImport(csv, { ...context, skuOwners: new Map([["OUTRO-UN", "produto-antigo"]]) });
    expect(rows[0].ok ? "" : rows[0].errors.join()).toMatch(/SKU OUTRO-UN já é do produto "produto-antigo"/);
    expect(rows[1].ok ? "" : rows[1].errors.join()).toMatch(/repetido/);
  });

  it("produto novo sem imagem entra como rascunho, com aviso", () => {
    const { rows } = analyzeImport([HEADER, "Pôster Senna;;Pôster em papel fosco 50x70.;colecionaveis;;;R$ 79,90;;Único:20;;;;;;;;"].join("\n"), context);
    expect(rows[0]).toMatchObject({ ok: true, product: { status: "draft", slug: "poster-senna" } });
    expect(rows[0].ok && rows[0].warnings.join()).toMatch(/rascunho/);
  });

  it("o modelo para download é lido pelo próprio importador", () => {
    const { rows, headerErrors } = analyzeImport(importTemplate(), { ...context, drivers: context.drivers, existing: new Map() });
    expect(headerErrors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.ok)).toBe(true);
  });
});

describe("importador CSV: URLs das imagens", () => {
  it("só endereços públicos http(s)", () => {
    expect(isPublicHttpUrl("https://images.unsplash.com/photo-1")).toBe(true);
    for (const url of ["http://localhost:3000/x.jpg", "http://127.0.0.1/x", "http://10.0.0.5/x", "http://192.168.1.1/x", "http://172.20.0.1/x", "http://169.254.169.254/latest", "http://[::1]/x", "ftp://x/y", "file:///etc/passwd", "nao-e-url"])
      expect(isPublicHttpUrl(url)).toBe(false);
  });
});

describe("importador CSV: curadoria da vitrine (refino 3)", () => {
  const head = `${HEADER};destaque;mais vendido;ordem_mais_vendido;novo até`;
  const line = (extra: string) => `Boné Curadoria;;Boné de teste da curadoria.;teamwear;;;R$ 99,90;;Único:3;;;;;;;;https://images.unsplash.com/photo-1;${extra}`;

  it("sim/não, ordem e data (AAAA-MM-DD ou DD/MM/AAAA); vazio não altera", () => {
    expect(parseYesNo("Sim")).toBe(true);
    expect(parseYesNo("não")).toBe(false);
    expect(parseYesNo("")).toBeUndefined();
    expect(parseYesNo("talvez")).toBeNull();
    expect(parseDate("31/12/2026")).toBe("2026-12-31");
    expect(parseDate("2026-12-31")).toBe("2026-12-31");
    expect(parseDate("31/02/2026")).toBeNull();
    expect(parseDate("")).toBeUndefined();
    const { rows } = analyzeImport([head, line("sim;sim;3;31/12/2026"), line(";;;").replace("Boné Curadoria", "Boné Curadoria 2")].join("\n"), context);
    expect(rows[0]).toMatchObject({ ok: true, product: { curation: { featured: true, bestsellerManual: true, bestsellerRank: 3, newUntil: "2026-12-31" } } });
    expect(rows[1]).toMatchObject({ ok: true, product: { curation: { featured: undefined, bestsellerManual: undefined, bestsellerRank: undefined, newUntil: undefined } } });
  });

  it("valores inválidos viram erro da linha", () => {
    const { rows } = analyzeImport([head, line("talvez;sim;0;32/13/2026")].join("\n"), context);
    expect(rows[0].ok).toBe(false);
    expect(!rows[0].ok && rows[0].errors.join(" ")).toMatch(/Destaque[\s\S]*Ordem[\s\S]*Data/);
  });
});
