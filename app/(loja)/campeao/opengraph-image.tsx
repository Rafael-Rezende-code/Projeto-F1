import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { CAMPEAO_META } from "@/lib/campeao";

// Imagem de compartilhamento de /campeao (next/og): a composição final achatada (rosto + coroa + título + selo),
// gerada por scripts/images/campeao-og.mjs a partir do próprio componente. Estática no build.
export const alt = CAMPEAO_META.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const file = await readFile(path.join(process.cwd(), "public/images/campeao/derivados/og-campeao.jpg"));
  const src = `data:image/jpeg;base64,${file.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#e4dfdc" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og só aceita <img> */}
        <img src={src} alt="" width={1200} height={630} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    ),
    size,
  );
}
