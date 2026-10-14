import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Áreas sem valor de busca (sacola, checkout, pedidos) ficam fora do índice.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/carrinho", "/checkout", "/pedido/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
