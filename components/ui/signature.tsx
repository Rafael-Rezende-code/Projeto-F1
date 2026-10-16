"use client";

// Signature da Spell UI (https://spell.sh/r/signature.json), instalado do registry. Adaptações (marcadas com APEX):
// 1) `fontUrl`: o original fixava /LastoriaBoldRegular.otf (arquivo do demo, não vem no pacote);
// 2) `stagger`: o intervalo entre letras (0,2 s fixo) vira prop, para o nome inteiro caber em ~2,2 s;
// 3) viewBox pela caixa real dos glifos: o SVG tinha altura fixa de 100 e cortava laços, ascendentes e descendentes;
// 4) `still`: aparece pronto (sem animação), para prefers-reduced-motion.
// opentype.js fixado em 1.3.4: a partir da 1.3.5, toPathData(3) espera um objeto e o arredondamento vira NaN.

import { useEffect, useId, useState } from "react";
import { motion } from "motion/react";
import { parse as parseFont } from "opentype.js";

type SignatureGlyph = {
  advanceWidth?: number;
  getPath: (
    x: number,
    y: number,
    fontSize: number,
  ) => {
    toPathData: (decimalPlaces?: number) => string;
    getBoundingBox: () => { x1: number; y1: number; x2: number; y2: number }; // APEX (3)
  };
};

type SignatureFont = {
  unitsPerEm: number;
  charToGlyph: (char: string) => SignatureGlyph;
};

const PATH_DELAY_STEP = 0.2;
const OPACITY_DELAY_OFFSET = 0.01;
const fontCache = new Map<string, SignatureFont>();

function getFontCacheKey(path: string): string {
  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return path;
  }
}

function getPathTransition(index: number, duration: number, delay: number, stagger: number) {
  const pathDelay = delay + index * stagger;

  return {
    pathLength: {
      delay: pathDelay,
      duration,
      ease: "easeInOut" as const,
    },
    opacity: {
      delay: pathDelay + OPACITY_DELAY_OFFSET,
      duration: 0.01,
    },
  };
}

async function loadFontFromPaths(fontPaths: string[]): Promise<SignatureFont> {
  for (const path of fontPaths) {
    try {
      const cacheKey = getFontCacheKey(path);
      const cachedFont = fontCache.get(cacheKey);

      if (cachedFont) {
        return cachedFont;
      }

      const response = await fetch(path);

      if (!response.ok) {
        continue;
      }

      const fontBuffer = await response.arrayBuffer();
      const font = parseFont(fontBuffer) as SignatureFont;
      fontCache.set(cacheKey, font);

      return font;
    } catch {
      // Try next path
    }
  }

  throw new Error(
    `Font could not be loaded from the provided path${fontPaths.length === 1 ? "" : "s"}: ${fontPaths.join(", ")}`,
  );
}

type Box = { x: number; y: number; width: number; height: number };

async function buildSignaturePaths({
  text,
  fontSize,
  baseline,
  horizontalPadding,
  fontUrl,
}: {
  text: string;
  fontSize: number;
  baseline: number;
  horizontalPadding: number;
  fontUrl: string;
}): Promise<{ paths: string[]; width: number; box: Box }> {
  const font = await loadFontFromPaths([fontUrl]); // APEX (1)
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity; // APEX (3)

  let x = horizontalPadding;
  const nextPaths: string[] = [];

  for (const char of text) {
    const glyph = font.charToGlyph(char);
    const path = glyph.getPath(x, baseline, fontSize);
    nextPaths.push(path.toPathData(3));
    const b = path.getBoundingBox(); // APEX (3): caixa real (laços e descendentes passam da linha de base)
    if (b.x2 > b.x1) { x1 = Math.min(x1, b.x1); y1 = Math.min(y1, b.y1); x2 = Math.max(x2, b.x2); y2 = Math.max(y2, b.y2); }

    const advanceWidth = glyph.advanceWidth ?? font.unitsPerEm;
    x += advanceWidth * (fontSize / font.unitsPerEm);
  }

  // Folga = metade do traço da máscara (fontSize * 0.22 / 2) + margem, para nada encostar na borda do SVG.
  const pad = fontSize * 0.15;
  const box = Number.isFinite(x1)
    ? { x: x1 - pad, y: y1 - pad, width: x2 - x1 + pad * 2, height: y2 - y1 + pad * 2 }
    : { x: 0, y: 0, width: x + horizontalPadding, height: baseline };
  return {
    paths: nextPaths,
    width: x + horizontalPadding,
    box,
  };
}

function renderMotionPaths({
  paths,
  stroke,
  strokeWidth,
  strokeLinecap,
  strokeLinejoin,
  duration,
  delay,
  stagger,
}: {
  paths: string[];
  stroke: string;
  strokeWidth: number;
  strokeLinecap: "round" | "butt";
  strokeLinejoin: "round";
  duration: number;
  delay: number;
  stagger: number;
}) {
  return paths.map((d, index) => (
    <motion.path
      key={index}
      d={d}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      variants={PATH_VARIANTS}
      transition={getPathTransition(index, duration, delay, stagger)}
      vectorEffect="non-scaling-stroke"
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
    />
  ));
}

const PATH_VARIANTS = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1 },
};

interface SignatureProps {
  text?: string;
  color?: string;
  fontSize?: number;
  duration?: number;
  delay?: number;
  className?: string;
  inView?: boolean;
  once?: boolean;
  /** APEX (1): arquivo da fonte (TTF/OTF/WOFF; WOFF2 não é lido pelo opentype.js) */
  fontUrl?: string;
  /** APEX (2): intervalo entre letras, em segundos (o original usa 0,2) */
  stagger?: number;
  /** APEX (4): mostra pronto, sem animar */
  still?: boolean;
}

export function Signature({
  text = "Signature",
  color = "#000",
  fontSize = 14,
  duration = 1.5,
  delay = 0,
  className,
  inView = false,
  once = true,
  fontUrl = "/LastoriaBoldRegular.otf",
  stagger = PATH_DELAY_STEP,
  still = false,
}: SignatureProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [box, setBox] = useState<Box | null>(null); // APEX (3)
  const horizontalPadding = fontSize * 0.1;
  const baseline = fontSize; // APEX (3): a altura vem da caixa dos glifos (viewBox), não de um SVG de 100
  const maskId = `signature-reveal-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    let isCancelled = false;

    async function loadSignaturePaths() {
      try {
        const { paths: nextPaths, box: nextBox } = await buildSignaturePaths({
          text,
          fontSize,
          baseline,
          horizontalPadding,
          fontUrl,
        });

        if (isCancelled) {
          return;
        }

        setPaths(nextPaths);
        setBox(nextBox);
      } catch {
        if (isCancelled) {
          return;
        }

        setPaths([]);
        setBox(null);
      }
    }

    void loadSignaturePaths();

    return () => {
      isCancelled = true;
    };
  }, [text, fontSize, baseline, horizontalPadding, fontUrl]);

  return (
    <motion.svg
      key={paths.length}
      // APEX (3): tamanho em em (1em = fontSize do texto), então o nome acompanha o font-size do contêiner
      width={box ? `${box.width / fontSize}em` : 0}
      height={box ? `${box.height / fontSize}em` : 0}
      viewBox={box ? `${box.x} ${box.y} ${box.width} ${box.height}` : undefined}
      fill="none"
      className={className}
      initial={still ? "visible" : "hidden"}
      whileInView={inView ? "visible" : undefined}
      animate={inView ? undefined : "visible"}
      viewport={{ once }}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          {renderMotionPaths({
            paths,
            stroke: "white",
            strokeWidth: fontSize * 0.22,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            duration,
            delay,
            stagger,
          })}
        </mask>
      </defs>

      {renderMotionPaths({
        paths,
        stroke: color,
        strokeWidth: 2,
        strokeLinecap: "butt",
        strokeLinejoin: "round",
        duration,
        delay,
        stagger,
      })}

      <g mask={`url(#${maskId})`}>
        {paths.map((d, index) => (
          <path key={index} d={d} fill={color} />
        ))}
      </g>
    </motion.svg>
  );
}
