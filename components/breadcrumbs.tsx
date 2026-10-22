import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

// Trilha de navegação (o último item é a página atual).
// `color`: cor sólida para todos os itens (ex.: sobre a cor da equipe, escolhida por lib/contrast.ts para dar ≥ 4,5:1);
// os links ganham sublinhado no hover em vez de mudar de opacidade.
export function Breadcrumbs({ items, tone = "dark", color }: { items: Crumb[]; tone?: "dark" | "light"; color?: string }) {
  const muted = color ? "underline-offset-4 hover:underline" : tone === "light" ? "text-white/70 hover:text-white" : "text-black/60 hover:text-black";
  const current = color ? "" : tone === "light" ? "text-white" : "text-black";
  return (
    <nav aria-label="Trilha de navegação" className="text-xs" style={color ? { color } : undefined}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className={`transition ${muted}`}>{item.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={current}>{item.label}</span>
              )}
              {!last && <ChevronRight size={12} aria-hidden="true" className={color ? "opacity-60" : tone === "light" ? "text-white/50" : "text-black/30"} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
