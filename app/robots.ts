import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Áreas sem valor de busca (sacola, checkout, pedidos) e o painel admin ficam fora do índice.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/carrinho", "/checkout", "/pedido/", "/admin"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
