"use client";

// Signature da Spell UI (https://spell.sh/r/signature.json), instalado do registry. Adaptações (marcadas com APEX):
// 1) contornos PRONTOS: o original lia a fonte no navegador com o opentype.js e convertia o texto em paths; aqui os paths
//    e a caixa vêm do servidor (lib/signature-paths.ts, no build). Sem opentype.js nem arquivo de fonte no cliente;
// 2) `stagger`: o intervalo entre letras (0,2 s fixo) vira prop, para o nome inteiro caber em ~2,2 s;
// 3) viewBox pela caixa real dos glifos: o SVG tinha altura fixa de 100 e cortava laços, ascendentes e descendentes;
// 4) `still`: aparece pronto (sem animação), para prefers-reduced-motion.
// A animação é a do original: cada letra tem o contorno desenhado (pathLength) e o preenchimento revelado por uma máscara.

import { useId } from "react";
import { motion } from "motion/react";

const PATH_DELAY_STEP = 0.2;
const OPACITY_DELAY_OFFSET = 0.01;

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

type Box = { x: number; y: number; width: number; height: number };

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
  /** APEX (1): um path SVG por letra, na ordem de escrita (lib/signature-paths.ts) */
  paths: string[];
  /** APEX (1)/(3): caixa real dos glifos (viewBox) */
  box: Box;
  color?: string;
  /** Unidades do viewBox que valem 1em (o tamanho usado para gerar os paths) */
  fontSize?: number;
  duration?: number;
  delay?: number;
  className?: string;
  inView?: boolean;
  once?: boolean;
  /** APEX (2): intervalo entre letras, em segundos (o original usa 0,2) */
  stagger?: number;
  /** APEX (4): mostra pronto, sem animar */
  still?: boolean;
}

export function Signature({
  paths,
  box,
  color = "#000",
  fontSize = 100,
  duration = 1.5,
  delay = 0,
  className,
  inView = false,
  once = true,
  stagger = PATH_DELAY_STEP,
  still = false,
}: SignatureProps) {
  const maskId = `signature-reveal-${useId().replace(/:/g, "")}`;

  return (
    <motion.svg
      // APEX (3): tamanho em em (1em = fontSize do texto), então o nome acompanha o font-size do contêiner
      width={`${box.width / fontSize}em`}
      height={`${box.height / fontSize}em`}
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
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
