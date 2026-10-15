import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

// Ícone da tela inicial (iOS), gerado a partir da marca. Troque quando houver a logo definitiva.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0b0b", color: "#fff", fontSize: 112, fontWeight: 800, fontStyle: "italic" }}>
        {BRAND.name.charAt(0)}
        <span style={{ color: BRAND.accentOnDark }}>{BRAND.mark}</span>
      </div>
    ),
    size,
  );
}
