import Link from "next/link";
import type { CSSProperties } from "react";
import type { Team } from "@/lib/catalog/types";

// Linha da "lista editorial" de equipes (navegação entre equipes): nome à esquerda, logo pequena à direita e um
// filete na cor da equipe. Hover/foco: a cor da equipe entra da esquerda (wipe) e nome e logo ficam brancos.
export function TeamRow({ team, current = false }: { team: Team; current?: boolean }) {
  const h = team.logo.displayHeight * 0.6;
  return (
    <Link
      href={`/equipes/${team.slug}`}
      aria-current={current ? "page" : undefined}
      className="group relative isolate flex items-center justify-between gap-6 px-4 py-4 text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:px-5"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 -z-10 origin-left transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100 ${current ? "scale-x-100" : "scale-x-0"}`}
        style={{ backgroundColor: team.color }}
      />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: team.color }} />
      <span className={`text-xl font-medium tracking-[-0.05em] transition-colors duration-300 group-hover:text-white group-focus-visible:text-white sm:text-2xl ${current ? "text-white" : ""}`}>
        {team.name}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- logo pequena e monocromática */}
      <img
        src={team.logo.src}
        alt=""
        width={team.logo.width}
        height={team.logo.height}
        loading="lazy"
        className={`w-auto shrink-0 transition duration-300 [height:var(--h)] group-hover:opacity-100 group-hover:[filter:brightness(0)_invert(1)] group-focus-visible:opacity-100 group-focus-visible:[filter:brightness(0)_invert(1)] ${
          current ? "[filter:brightness(0)_invert(1)]" : "opacity-55 [filter:brightness(0)]"
        }`}
        style={{ "--h": `${h}px` } as CSSProperties}
      />
    </Link>
  );
}
