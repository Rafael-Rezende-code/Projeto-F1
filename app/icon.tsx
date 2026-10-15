import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

// Favicon gerado a partir da marca (inicial + ponto laranja). Troque por um arquivo de logo quando houver a definitiva.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0b0b", borderRadius: 7, color: "#fff", fontSize: 22, fontWeight: 800, fontStyle: "italic" }}>
        {BRAND.name.charAt(0)}
        <span style={{ color: BRAND.accentOnDark }}>{BRAND.mark}</span>
      </div>
    ),
    size,
  );
}
