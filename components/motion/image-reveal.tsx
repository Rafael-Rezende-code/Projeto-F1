"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { clearCue, fireCue } from "@/components/motion/cue";
import { duration, viewport } from "@/lib/motion";

type Props = {
  children: ReactNode;
  /**
   * curtain: cortina na cor `color` que se abre (clip-path) enquanto a foto sai de ~1,06× e desfocada para 1× e nítida
   * (~1 s, tokens --motion-reveal / --ease-*). Começa coberta já no HTML do servidor: a foto nunca "pipoca".
   * fade: entrada sutil (opacidade + escala 1,03 → 1) por cima do placeholder desfocado; só se a foto ainda não tiver
   * carregado ao montar (a que já está pronta não anima).
   */
  variant?: "curtain" | "fade";
  /** Cor da cortina (variant curtain). */
  color?: string;
  /** load: começa assim que a foto estiver decodificada. view: espera também a foto entrar na tela. */
  start?: "load" | "view";
  /** Placeholder desfocado (data URL) mostrado atrás da foto enquanto ela carrega (lib/local-images.ts). */
  blur?: string;
  /** Sinal disparado quando a revelação começa (components/motion/cue.ts), para coreografar outro elemento. */
  cue?: string;
  className?: string;
  style?: CSSProperties;
};

// Entrada das fotos (fase 1 da rodada de conteúdo). A animação só começa com a imagem DECODIFICADA (img.decode()),
// nunca no meio do carregamento. Estados em data-state: pending (escondida/coberta) → in (anima) → done (fim: nenhuma
// regra da entrada vale mais, e o hover da foto volta às transições dela); idle = sem animação.
// CSS em app/globals.css (.img-reveal). Com prefers-reduced-motion: só opacidade (sem cortina, escala nem desfoque).
// Sem JavaScript: <noscript> mostra a foto pronta.
export function ImageReveal({ children, variant = "fade", color, start = "load", blur, cue, className = "", style }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const img = el?.querySelector("img");
    if (!el || !img) return;
    let cancelled = false;
    const cleanups: (() => void)[] = [];

    const loaded = () => img.complete && img.naturalWidth > 0;
    if (variant === "fade") {
      if (loaded()) return; // já pronta: aparece como veio do servidor
      el.dataset.state = "pending";
    }

    const reveal = () => {
      if (cancelled || el.dataset.state !== "pending") return;
      el.dataset.state = "in";
      if (cue) fireCue(cue);
      const done = window.setTimeout(() => (el.dataset.state = "done"), (duration.reveal + 0.1) * 1000);
      cleanups.push(() => window.clearTimeout(done));
    };
    const whenDecoded = (next: () => void) => {
      const go = () => img.decode().catch(() => undefined).then(() => !cancelled && next());
      if (loaded()) return go();
      const onDone = () => go();
      img.addEventListener("load", onDone, { once: true });
      img.addEventListener("error", onDone, { once: true });
      cleanups.push(() => {
        img.removeEventListener("load", onDone);
        img.removeEventListener("error", onDone);
      });
    };
    const whenVisible = (next: () => void) => {
      if (start !== "view") return next();
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          next();
        },
        { rootMargin: viewport.margin, threshold: 0.15 },
      );
      observer.observe(el);
      cleanups.push(() => observer.disconnect());
    };

    // Nunca deixa a foto coberta: se algo travar (decode, observer), revela em 6 s.
    const failsafe = window.setTimeout(reveal, start === "view" ? 60_000 : 6000);
    cleanups.push(() => window.clearTimeout(failsafe));
    whenVisible(() => whenDecoded(() => requestAnimationFrame(reveal)));

    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
      if (cue) clearCue(cue);
    };
  }, [variant, start, cue]);

  return (
    <div
      ref={ref}
      data-variant={variant}
      data-state={variant === "curtain" ? "pending" : "idle"}
      className={`img-reveal ${className}`}
      style={{ ...style, "--reveal-color": color ?? "#111" } as CSSProperties}
    >
      {blur && <span aria-hidden="true" className="img-reveal__blur" style={{ backgroundImage: `url("${blur}")` }} />}
      {children}
      {variant === "curtain" && <span aria-hidden="true" className="img-reveal__curtain" />}
      {variant === "curtain" && (
        <noscript>
          <style>{".img-reveal__curtain{display:none}.img-reveal[data-state=pending] img{transform:none!important;filter:none!important;opacity:1!important}"}</style>
        </noscript>
      )}
    </div>
  );
}
