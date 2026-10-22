import data from "@/lib/generated/blur-placeholders.json";

// Fotos locais de public/images: dimensões reais e placeholder desfocado, gerados no build por
// scripts/images/blur-placeholders.mjs (`pnpm images:blur` para gerar à mão depois de trocar/acrescentar uma foto).
// Imagens remotas (Unsplash, Vercel Blob) não estão aqui: ficam sem placeholder desfocado.
type LocalImage = { w: number; h: number; blur: string };
const images = data as Record<string, LocalImage>;

export const localImage = (src: string): LocalImage | undefined => images[src];

/** Props do next/image para o placeholder desfocado (vazio se a foto não for local ou ainda não tiver sido gerada). */
export function blurProps(src: string) {
  const image = images[src];
  return image ? ({ placeholder: "blur", blurDataURL: image.blur } as const) : {};
}

/** Primeira versão existente de `base` + extensão (ex.: versões opcionais de desktop). Lido no build. */
export function findLocalImage(base: string) {
  for (const ext of ["jpg", "jpeg", "png", "webp", "avif"]) {
    const src = `${base}.${ext}`;
    const image = images[src];
    if (image) return { src, width: image.w, height: image.h };
  }
  return undefined;
}
