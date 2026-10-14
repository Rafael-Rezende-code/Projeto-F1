"use client";

import React, { memo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useMotionValue, animate, motion } from "motion/react";
import useMeasure from "react-use-measure";

export type Logo = {
  /** Caminho do arquivo (ex.: "/logos/ferrari.svg"). Sem src, o nome aparece em texto. */
  src?: string;
  alt: string;
  /** Dimensões do arquivo em px. */
  width?: number;
  height?: number;
  /** Altura óptica no desktop, em px (no celular, 75%). Padrão: 32. O arquivo deve vir recortado, sem margem. */
  displayHeight?: number;
};

type InfiniteSliderProps = {
  children: React.ReactNode;
  gap?: number;
  duration?: number;
  durationOnHover?: number;
  direction?: "horizontal" | "vertical";
  reverse?: boolean;
  className?: string;
};

const InfiniteSlider = memo(function InfiniteSlider({
  children,
  gap = 16,
  duration = 25,
  durationOnHover,
  direction = "horizontal",
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const [currentDuration, setCurrentDuration] = useState(duration);
  const [ref, { width, height }] = useMeasure();
  const translation = useMotionValue(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const size = direction === "horizontal" ? width : height;
    const contentSize = size + gap;
    const from = reverse ? -contentSize / 2 : 0;
    const to = reverse ? 0 : -contentSize / 2;
    let controls;

    if (isTransitioning) {
      controls = animate(translation, [translation.get(), to], {
        ease: "linear",
        // Um ciclo percorre contentSize / 2 (o conteúdo vem duplicado); dividir por contentSize
        // dobrava a velocidade nesta transição, e o hover não desacelerava.
        duration: currentDuration * Math.abs((translation.get() - to) / (contentSize / 2)),
        onComplete: () => {
          setIsTransitioning(false);
          setKey((prev) => prev + 1);
        },
      });
    } else {
      controls = animate(translation, [from, to], {
        ease: "linear",
        duration: currentDuration,
        repeat: Infinity,
        repeatType: "loop",
        repeatDelay: 0,
        onRepeat: () => translation.set(from),
      });
    }

    return controls?.stop;
  }, [key, translation, currentDuration, width, height, gap, isTransitioning, direction, reverse]);

  const hoverProps = durationOnHover
    ? {
        onHoverStart: () => {
          setIsTransitioning(true);
          setCurrentDuration(durationOnHover);
        },
        onHoverEnd: () => {
          setIsTransitioning(true);
          setCurrentDuration(duration);
        },
      }
    : {};

  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        ref={ref}
        className="flex w-max items-center"
        style={{
          ...(direction === "horizontal" ? { x: translation } : { y: translation }),
          gap: `${gap}px`,
          flexDirection: direction === "horizontal" ? "row" : "column",
        }}
        {...hoverProps}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
});

// Cor escura fixa: a faixa tem fundo claro sempre, independente do tema do sistema.
const itemClass = "select-none opacity-55 transition-opacity duration-300 hover:opacity-100";

export const LogoItem = memo(function LogoItem({ logo }: { logo: Logo }) {
  if (!logo.src) {
    return (
      <span className={cn(itemClass, "whitespace-nowrap text-xs font-semibold uppercase tracking-[0.25em] text-black md:text-sm")}>
        {logo.alt}
      </span>
    );
  }
  const height = logo.displayHeight ?? 32;
  const sizeVars = { "--logo-h-sm": `${height * 0.75}px`, "--logo-h-md": `${height}px` } as React.CSSProperties;
  return (
    <span className={cn(itemClass, "flex shrink-0 [--logo-h:var(--logo-h-sm)] md:[--logo-h:var(--logo-h-md)]")} style={sizeVars}>
      <img
        alt={logo.alt}
        src={logo.src}
        width={logo.width}
        height={logo.height}
        loading="lazy"
        draggable={false}
        className="pointer-events-none h-[var(--logo-h)] w-auto max-w-none brightness-0"
      />
    </span>
  );
});

export const LogoMarquee = memo(function LogoMarquee({
  logos,
  className,
}: {
  logos: Logo[];
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-7xl overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]", className)}>
      {/* A faixa repete a lista 4 vezes (2 aqui + 2 no InfiniteSlider): o leitor de tela lê esta lista única. */}
      <ul role="list" className="sr-only">
        {logos.map((logo) => (
          <li key={logo.alt}>{logo.alt}</li>
        ))}
      </ul>
      <div aria-hidden="true">
        <InfiniteSlider gap={56} reverse duration={80} durationOnHover={160}>
          {[...logos, ...logos].map((logo, i) => (
            <LogoItem key={`${logo.alt}-${i}`} logo={logo} />
          ))}
        </InfiniteSlider>
      </div>
    </div>
  );
});

LogoMarquee.displayName = "LogoMarquee";
export default LogoMarquee;
