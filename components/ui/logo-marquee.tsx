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
  /** Área do desenho no arquivo [x, y, largura, altura] em px: ignora margens transparentes do arquivo. */
  crop?: [number, number, number, number];
  /** Altura óptica do desenho no desktop, em px (no celular, 75%). Padrão: 32. */
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
        duration: currentDuration * Math.abs((translation.get() - to) / contentSize),
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
const itemClass = "select-none opacity-55 transition-opacity duration-300 hover:opacity-100 motion-reduce:transition-none";

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
  let imgStyle: React.CSSProperties = { height: "var(--logo-h)" };
  if (logo.crop && logo.width && logo.height) {
    // O img é escalado para o desenho ter --logo-h de altura; as margens transparentes do arquivo
    // viram margem negativa, então o item ocupa só a área do desenho.
    const [x, y, w, h] = logo.crop;
    const px = (n: number) => `calc(var(--logo-h) * ${(n / h).toFixed(4)})`;
    const neg = (n: number) => `calc(var(--logo-h) * ${(-n / h).toFixed(4)})`;
    imgStyle = {
      height: px(logo.height),
      margin: `${neg(y)} ${neg(logo.width - x - w)} ${neg(logo.height - y - h)} ${neg(x)}`,
    };
  }
  return (
    <span className={cn(itemClass, "flex shrink-0 [--logo-h:var(--logo-h-sm)] md:[--logo-h:var(--logo-h-md)]")} style={sizeVars}>
      <img
        alt={logo.alt}
        src={logo.src}
        width={logo.width}
        height={logo.height}
        loading="lazy"
        draggable={false}
        className="pointer-events-none w-auto max-w-none brightness-0"
        style={imgStyle}
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
      <InfiniteSlider gap={56} reverse duration={80} durationOnHover={25}>
        {[...logos, ...logos].map((logo, i) => (
          <LogoItem key={`${logo.alt}-${i}`} logo={logo} />
        ))}
      </InfiniteSlider>
    </div>
  );
});

LogoMarquee.displayName = "LogoMarquee";
export default LogoMarquee;
