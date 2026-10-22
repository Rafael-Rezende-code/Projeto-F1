import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { isPublicHttpUrl } from "./import";

// Fotos do importador (lançamento, item 3): baixa cada URL no SERVIDOR, otimiza (gira pela EXIF, no máximo 2000px,
// WebP q85; acima de 2 MB, q70) e guarda no Supabase Storage (bucket "produtos", pasta importados/{slug}/). O nome do
// arquivo vem da URL, então importar de novo sobrescreve em vez de duplicar. Falha → o produto entra como rascunho.
const MAX_DOWNLOAD = 15 * 1024 * 1024;
const MAX_OUTPUT = 2 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

export type StoredImage = { src: string; alt: string; storage_path: string };

export async function importImage(supabase: SupabaseClient, slug: string, url: string, alt: string): Promise<StoredImage> {
  if (!isPublicHttpUrl(url)) throw new Error("endereço não permitido");
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "image/*" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!isPublicHttpUrl(response.url || url)) throw new Error("redirecionou para endereço não permitido");
  if (Number(response.headers.get("content-length") ?? 0) > MAX_DOWNLOAD) throw new Error("arquivo acima de 15 MB");
  const input = Buffer.from(await response.arrayBuffer());
  if (input.byteLength > MAX_DOWNLOAD) throw new Error("arquivo acima de 15 MB");
  const optimize = (quality: number) =>
    sharp(input, { limitInputPixels: 80_000_000 }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer();
  let output: Buffer;
  try {
    output = await optimize(85);
    if (output.byteLength > MAX_OUTPUT) output = await optimize(70);
  } catch {
    throw new Error("não é uma imagem válida");
  }
  if (output.byteLength > MAX_OUTPUT) throw new Error("imagem grande demais mesmo otimizada");
  const path = `importados/${slug}/${createHash("sha1").update(url).digest("hex").slice(0, 12)}.webp`;
  const { error } = await supabase.storage.from("produtos").upload(path, output, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
  if (error) throw new Error(`Storage: ${error.message}`);
  return { src: supabase.storage.from("produtos").getPublicUrl(path).data.publicUrl, alt, storage_path: path };
}

/** Executa `task` para cada item com no máximo `limit` ao mesmo tempo. */
export async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}
