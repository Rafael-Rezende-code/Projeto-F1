import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { getLegend, legends } from "@/lib/content/legends";

// Imagem de compartilhamento de cada lenda (loja extra, item 7): o nome em tipografia forte sobre o tom da lenda.
// Sem foto (nem de terceiros, nem do projeto): só desenho.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Lenda da Fórmula 1";

export function generateStaticParams() {
  return legends.map((legend) => ({ slug: legend.slug }));
}

export default async function LegendOpengraph({ params }: { params: Promise<{ slug: string }> }) {
  const legend = getLegend((await params).slug);
  const name = legend?.name ?? "Lendas";
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
          background: `radial-gradient(circle at 85% 10%, ${legend?.color ?? BRAND.accent}, transparent 55%), linear-gradient(160deg, #151515 0%, #0b0b0b 70%)`,
        }}
      >
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, textTransform: "uppercase", color: BRAND.accentOnDark }}>
          {`Lendas · ${legend ? `${legend.country} · ${legend.years}` : "Fórmula 1"}`}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: name.length > 14 ? 120 : 150, fontWeight: 800, lineHeight: 0.95, letterSpacing: -6 }}>{name}</div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: "rgba(255,255,255,0.8)" }}>{`${BRAND.name}${BRAND.mark} · homenagem de fãs`}</div>
        </div>
      </div>
    ),
    size,
  );
}
