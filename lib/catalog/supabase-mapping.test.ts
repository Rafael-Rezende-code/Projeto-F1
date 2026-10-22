import { describe, expect, it } from "vitest";
import { seedData } from "./seed-repository";
import { driverFromRow, driverToRow, productFromRow, productToRows, teamFromRow, teamToRow } from "./supabase-mapping";

describe("mapeamento Supabase ↔ catálogo", () => {
  it("produto do seed vai e volta igual (com variantes e imagens)", () => {
    const product = seedData.products.find((item) => item.compareAtPriceCents)!;
    const { row, variants, images } = productToRows(product, 3);
    const back = productFromRow({
      ...row,
      id: "uuid-qualquer",
      product_variants: variants.map((variant) => ({ ...variant, product_id: "uuid-qualquer" })).reverse(),
      product_images: images.map((image) => ({ ...image, product_id: "uuid-qualquer" })).reverse(),
    });
    expect(back).toEqual(product);
    expect(row.price_cents).toBe(product.priceCents);
  });

  it("equipe e piloto vão e voltam iguais", () => {
    const team = seedData.teams[2];
    expect(teamFromRow(teamToRow(team, 2))).toEqual(team);
    const driver = seedData.drivers[0];
    expect(driverFromRow(driverToRow(driver, 0))).toEqual({ ...driver, number: undefined });
  });

  it("piloto sem cadastro no site usa a foto da linha", () => {
    const driver = driverFromRow({ slug: "novo", name: "Piloto Novo", team_slug: "haas", number: 7, phrase: "", image: "/x.jpg", position: 9 });
    expect(driver.photoMain.src).toBe("/x.jpg");
    expect(driver.number).toBe(7);
  });
});
