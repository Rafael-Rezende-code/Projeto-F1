"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { TiltCard } from "@/components/ui/tilt-card";

// TiltCard só onde há mouse (hover + ponteiro fino). No toque, nada de inclinação: renderiza só o conteúdo.
// O HTML do servidor (e a hidratação) sai sem tilt; o tilt entra logo depois de montar, sem mismatch.
const QUERY = "(hover: hover) and (pointer: fine)";
const subscribe = (callback: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

export function TiltOnHover({ children, className }: { children: ReactNode; className?: string }) {
  const canHover = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  if (!canHover) return <div className={className}>{children}</div>;
  return (
    <TiltCard tiltLimit={8} scale={1.03} effect="evade" spotlight className={className}>
      {children}
    </TiltCard>
  );
}
