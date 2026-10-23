import { formatPrice } from "@/lib/format";

// Faturamento por dia (operação, fase 2): barras em SVG, uma série (sem legenda: o título nomeia), cor única, base
// reta e topo arredondado (4px), 2px de folga entre barras, grade recessiva. Hover: <title> nativo por barra (área de
// toque = coluna inteira). Tabela com os mesmos números logo abaixo (leitor de tela e conferência).
export function RevenueBars({ data }: { data: { day: string; orders: number; revenueCents: number }[] }) {
  const max = Math.max(...data.map((row) => row.revenueCents), 1);
  const width = 720;
  const height = 180;
  const slot = width / data.length;
  const bar = Math.max(slot - 2, 1);
  const label = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
  const every = Math.ceil(data.length / 6);
  // rótulos: um a cada `every` dias, o último sempre; o penúltimo some se encostar no último
  const showLabel = (i: number) => i === data.length - 1 || (i % every === 0 && data.length - 1 - i >= every / 2);
  const anchor = (i: number) => (i === 0 ? "start" : i === data.length - 1 ? "end" : "middle");
  const labelX = (i: number) => (i === 0 ? i * slot : i === data.length - 1 ? (i + 1) * slot : i * slot + slot / 2);
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${width} ${height + 24}`} role="img" aria-label="Faturamento por dia no período" className="block h-auto w-full">
        <line x1="0" x2={width} y1={height} y2={height} stroke="currentColor" strokeOpacity="0.15" />
        <line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="currentColor" strokeOpacity="0.07" />
        {data.map((row, i) => {
          const h = row.revenueCents ? Math.max((row.revenueCents / max) * (height - 8), 3) : 0;
          const x = i * slot + (slot - bar) / 2;
          const r = Math.min(4, bar / 2, h);
          return (
            <g key={row.day}>
              <title>{`${label(row.day)}: ${formatPrice(row.revenueCents)} · ${row.orders} pedido(s)`}</title>
              <rect x={i * slot} y="0" width={slot} height={height} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${height} V${height - h + r} Q${x},${height - h} ${x + r},${height - h} H${x + bar - r} Q${x + bar},${height - h} ${x + bar},${height - h + r} V${height} Z`}
                  fill="#b94f01"
                />
              )}
              {showLabel(i) && (
                <text x={labelX(i)} y={height + 18} textAnchor={anchor(i)} fontSize="14" fill="currentColor" fillOpacity="0.6">{label(row.day)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-xs text-black/60">Maior dia: {formatPrice(max === 1 ? 0 : max)}. Passe o mouse numa barra para ver o dia.</figcaption>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-black/70">Ver em tabela</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-black/60"><tr><th className="py-1 font-medium">Dia</th><th className="py-1 font-medium">Pedidos</th><th className="py-1 font-medium">Faturamento</th></tr></thead>
          <tbody>
            {data.map((row) => <tr key={row.day} className="border-t border-black/5"><td className="py-1">{label(row.day)}</td><td className="py-1">{row.orders}</td><td className="py-1">{formatPrice(row.revenueCents)}</td></tr>)}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
