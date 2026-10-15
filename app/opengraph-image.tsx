import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

// Imagem Open Graph padrão (compartilhamento), gerada a partir do nome e da assinatura da marca.
// Produto e piloto usam a própria foto (generateMetadata). Troque o desenho quando houver identidade definitiva.
export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#fff",
          background: `radial-gradient(circle at 85% 20%, rgba(232,112,42,0.55), transparent 45%), linear-gradient(135deg, #0b0b0b 0%, #151515 60%, ${BRAND.accent} 160%)`,
        }}
      >
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, textTransform: "uppercase", color: BRAND.accentOnDark }}>Fórmula 1 · Coleção</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 220, fontWeight: 800, fontStyle: "italic", lineHeight: 1, letterSpacing: -10 }}>
            {BRAND.name}
            <span style={{ color: BRAND.accentOnDark }}>{BRAND.mark}</span>
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 40, color: "rgba(255,255,255,0.8)" }}>{BRAND.tagline}</div>
        </div>
      </div>
    ),
    size,
  );
}
