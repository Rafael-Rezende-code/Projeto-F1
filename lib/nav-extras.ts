import "server-only";
import type { NavLink } from "@/lib/navigation";
import { visibleDrops } from "@/lib/drops";
import { getDrops } from "@/lib/drops-store";

// Links que só aparecem quando há conteúdo (loja extra): "Drops" com drop ativo ou futuro.
const renderTime = () => Date.now();

export async function navExtras(): Promise<NavLink[]> {
  const links: NavLink[] = [];
  if (visibleDrops(await getDrops(), renderTime()).length) links.push({ label: "Drops", href: "/drops" });
  return links;
}
