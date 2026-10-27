"use server";

import { z } from "zod";
import { allowRequest } from "@/lib/rate-limit";
import { RATE_LIMIT_MESSAGE } from "@/lib/rate-limit-config";
import { isOrderStoreConfigured } from "@/lib/supabase/config";
import { isWishlistToken, WISHLIST_MAX } from "@/lib/wishlist";
import { saveShortList } from "@/lib/wishlist-store";

export type ShareListResult = { ok: true; token: string; secret?: string } | { ok: false; message: string };

// Link curto da lista de desejos (loja extra, item 4). Só com Supabase; cada lista nova conta no limite por IP ("lista"); atualizar
// a mesma lista exige a chave de edição guardada no aparelho de quem criou.
export async function shareWishlist(input: unknown): Promise<ShareListResult> {
  if (!isOrderStoreConfigured()) return { ok: false, message: "Link curto indisponível. Use o link completo." };
  const parsed = z
    .object({
      slugs: z.array(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100)).min(1).max(WISHLIST_MAX),
      name: z.string().max(60),
      token: z.string().optional(),
      secret: z.string().max(64).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira a lista." };
  const { token, secret } = parsed.data;
  const updating = Boolean(token && secret && isWishlistToken(token));
  if (!updating && !(await allowRequest("lista"))) return { ok: false, message: RATE_LIMIT_MESSAGE };
  const result = await saveShortList({ ...parsed.data, token: updating ? token : undefined, secret: updating ? secret : undefined });
  if (!result.ok) {
    console.error("[lista] gravação:", result.error);
    return { ok: false, message: "Não foi possível criar o link agora. Use o link completo." };
  }
  return result;
}
