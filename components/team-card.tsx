import type { CSSProperties } from "react";
import Link from "next/link";
import { TiltOnHover } from "@/components/motion/tilt-on-hover";
import type { TeamIdentity } from "@/lib/teams";

// Card flat da equipe (home e /equipes): cor sólida, logo branca grande e o rótulo "VER COLEÇÃO →".
// O nome não se repete abaixo da logo (a logo já diz o nome); fica como texto acessível (sr-only).
// Hover: a cor escurece levemente e a logo sobe 4px; no desktop o card inclina (TiltCard ~8°, scale 1.03, brilho).
// Leva a /equipes/[slug].
export function TeamCard({ team }: { team: TeamIdentity }) {
  const { logo } = team;
  const height = (logo.displayHeight ?? 32) * 1.45;
  return (
    <TiltOnHover className="rounded-2xl">
      <Link
        href={`/equipes/${team.slug}`}
        className="group relative isolate flex aspect-[1.25] flex-col sm:aspect-[1.7] items-center justify-center overflow-hidden rounded-2xl text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
        style={{ backgroundColor: team.color }}
      >
        <span aria-hidden="true" className="absolute inset-0 bg-black/0 transition duration-[var(--motion-fast)] group-hover:bg-black/12" />
        {/* eslint-disable-next-line @next/next/no-img-element -- logo pequena e monocromática (mesmo arquivo da faixa) */}
        <img
          src={logo.src}
          alt=""
          width={logo.width}
          height={logo.height}
          loading="lazy"
          className="relative mb-7 w-auto max-w-[72%] sm:mb-3 object-contain transition duration-[var(--motion-base)] ease-[var(--ease-out)] [filter:brightness(0)_invert(1)] [height:calc(var(--h)*0.6)] group-hover:-translate-y-1 sm:[height:calc(var(--h)*0.75)] lg:[height:var(--h)]"
          style={{ "--h": `${height}px` } as CSSProperties}
        />
        <span className="sr-only">{team.name}</span>
        {/* Rótulo pequeno sobre uma pílula escura: texto pequeno precisa de 4,5:1, e algumas cores (McLaren, Mercedes,
            Alpine) só dão ~3:1 com branco direto. */}
        <span aria-hidden="true" className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white sm:bottom-3.5">
          Ver coleção →
        </span>
      </Link>
    </TiltOnHover>
  );
}
