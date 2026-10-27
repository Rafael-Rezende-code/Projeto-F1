import type { MetadataRoute } from "next";
import { ALLOW_INDEXING } from "@/lib/indexing";
import { SITE_URL } from "@/lib/site";

// Antes do lançamento (NEXT_PUBLIC_ALLOW_INDEXING diferente de "true"): tudo bloqueado e sem sitemap. Depois: áreas
// sem valor de busca (sacola, checkout, pedidos, listas de desejos) e o painel admin continuam fora do índice.
export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/carrinho", "/checkout", "/pedido/", "/admin", "/desejos"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
