import { describe, expect, it } from "vitest";
import { cleanListName, decodeWishlist, encodeWishlist, isWishlistToken, wishlistQuery, wishlistTitle } from "./wishlist";

describe("lista de desejos", () => {
  it("compacta ids do catálogo em base 36 e usa o slug para os outros; ida e volta mantém a ordem", () => {
    const products = [
      { id: "APX-007", slug: "camiseta-ferrari-2026" },
      { id: "APX-066", slug: "poster-bortoleto" },
      { id: "3f2a9c1e-uuid", slug: "caneca-monaco" },
    ];
    const encoded = encodeWishlist(products);
    expect(encoded).toBe("7.1u.-caneca-monaco");
    expect(decodeWishlist(encoded)).toEqual([{ code: "APX-007" }, { code: "APX-066" }, { slug: "caneca-monaco" }]);
  });

  it("ignora lixo e repetidos; limita a 60 itens", () => {
    expect(decodeWishlist("7.7.<script>.-Maiuscula.zzzzzz.-ok")).toEqual([{ code: "APX-007" }, { slug: "ok" }]);
    expect(decodeWishlist(Array.from({ length: 80 }, (_, i) => (i + 1).toString(36)).join("."))).toHaveLength(60);
    expect(decodeWishlist(null)).toEqual([]);
  });

  it("nome opcional limpo e título", () => {
    expect(cleanListName("  Ana <b>Júlia</b>  ")).toBe("Ana bJúliab");
    expect(cleanListName("x".repeat(50))).toHaveLength(30);
    expect(wishlistTitle("Rafa")).toBe("A lista de Rafa");
    expect(wishlistTitle("")).toBe("Uma lista de desejos");
    expect(wishlistQuery([{ id: "APX-001", slug: "a" }], "Rafa")).toBe("/desejos?l=1&n=Rafa");
    expect(isWishlistToken("aB3dE5gH9k")).toBe(true);
    expect(isWishlistToken("curto")).toBe(false);
  });
});
