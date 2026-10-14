import type { CSSProperties } from "react";
import type { TeamIdentity } from "@/lib/teams";

// Card flat da equipe (home, "Com quem você corre?"): cor sólida, logo e nome sempre brancos.
// Hover: a cor escurece levemente (véu preto) e a logo sobe 4px. Leva a /equipes/[slug].
export function TeamCard({ team, className = "" }: { team: TeamIdentity; className?: string }) {
  const { logo } = team;
  const height = (logo.displayHeight ?? 32) * 1.15;
  return (
    <a
      href={`/equipes/${team.slug}`}
      className={`group relative isolate flex aspect-[1.4] flex-col items-center justify-center overflow-hidden rounded-2xl text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black ${className}`}
      style={{ backgroundColor: team.color }}
    >
      <span aria-hidden="true" className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/12" />
      {/* eslint-disable-next-line @next/next/no-img-element -- logo pequena e monocromática (mesmo arquivo da faixa) */}
      <img
        src={logo.src}
        alt=""
        width={logo.width}
        height={logo.height}
        loading="lazy"
        className="relative mb-6 w-auto max-w-[70%] object-contain transition duration-300 ease-out [filter:brightness(0)_invert(1)] [height:calc(var(--h)*0.62)] group-hover:-translate-y-1 sm:mb-8 lg:[height:var(--h)]"
        style={{ "--h": `${height}px` } as CSSProperties}
      />
      <span className="absolute inset-x-3 bottom-3 text-center text-[19px] font-bold leading-6 tracking-[-0.03em] sm:bottom-4 lg:text-xl">
        {team.name}
      </span>
    </a>
  );
}
