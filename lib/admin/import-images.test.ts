import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { importImage } = await import("./import-images");

// Storage falso: guarda o que foi enviado.
function fakeSupabase() {
  const uploads: { path: string; size: number; type?: string }[] = [];
  const bucket = {
    upload: async (path: string, body: Buffer, options: { contentType?: string }) => {
      uploads.push({ path, size: body.byteLength, type: options.contentType });
      return { error: null };
    },
    getPublicUrl: (path: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/produtos/${path}` } }),
  };
  return { uploads, client: { storage: { from: () => bucket } } as never };
}
const respond = (body: Buffer | string, init: ResponseInit = {}) => vi.stubGlobal("fetch", vi.fn(async () => new Response(body, init)));

afterEach(() => vi.unstubAllGlobals());

describe("fotos do importador", () => {
  it("baixa, reduz para no máximo 2000px, converte para WebP e guarda em importados/{slug}/", async () => {
    const png = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: "#c8102e" } }).png().toBuffer();
    respond(png, { headers: { "content-type": "image/png" } });
    const { client, uploads } = fakeSupabase();
    const image = await importImage(client, "camiseta-x", "https://img.exemplo/a.png", "Camiseta X");
    expect(image.storage_path).toMatch(/^importados\/camiseta-x\/[0-9a-f]{12}\.webp$/);
    expect(image.src).toContain(image.storage_path);
    expect(uploads[0].type).toBe("image/webp");
    expect(uploads[0].size).toBeLessThan(png.byteLength);
  });

  it("recusa o que não é imagem, HTTP de erro e endereço interno", async () => {
    const { client } = fakeSupabase();
    respond("<html>não é imagem</html>", { headers: { "content-type": "text/html" } });
    await expect(importImage(client, "x", "https://img.exemplo/b.jpg", "X")).rejects.toThrow("não é uma imagem válida");
    respond("", { status: 404 });
    await expect(importImage(client, "x", "https://img.exemplo/c.jpg", "X")).rejects.toThrow("HTTP 404");
    await expect(importImage(client, "x", "http://169.254.169.254/latest/meta-data", "X")).rejects.toThrow("endereço não permitido");
  });

  it("limite de tamanho do download", async () => {
    const { client } = fakeSupabase();
    respond("x", { headers: { "content-length": String(20 * 1024 * 1024) } });
    await expect(importImage(client, "x", "https://img.exemplo/d.jpg", "X")).rejects.toThrow("15 MB");
  });
});
