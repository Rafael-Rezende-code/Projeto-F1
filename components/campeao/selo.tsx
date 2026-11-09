"use client";

import { useId } from "react";
import { COROACAO } from "@/lib/campeao";

/** Selo circular: texto em textPath (textLength 486 fecha o círculo), gira 28 s por volta; "20" no centro. */
export function CampeaoSelo({ className = "", visible = true }: { className?: string; visible?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className={`campeao-selo ${visible ? "is-on" : ""} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <defs>
          <path id={`selo-${id}`} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeWidth=".8" />
        <text fontSize="12" fill="currentColor" className="campeao-selo-texto">
          <textPath href={`#selo-${id}`} textLength="486" lengthAdjust="spacing">
            {COROACAO.seal.text}
          </textPath>
        </text>
      </svg>
      <span className="campeao-selo-miolo">{COROACAO.seal.center}</span>
    </div>
  );
}
