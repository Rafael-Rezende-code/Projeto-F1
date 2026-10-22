"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import Image from "next/image";
import { animate, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useCue } from "@/components/motion/cue";
import { carClock, carKeyframes, carTransforms } from "@/lib/car-motion";
import { car } from "@/lib/motion";

type Props = {
  src: string;
  width: number;
  height: number;
  /** Para que lado o carro aponta NO ARQUIVO e na página (não espelha: os patrocinadores continuam legíveis). */
  facing: "left" | "right";
  /** Sinal do INÍCIO do desenho da assinatura (components/driver-signature.tsx). */
  cue: string;
  blur?: string;
  sizes: string;
  /** Cor do fundo do bloco (a da equipe): o painel que esconde o texto até o carro passar. */
  cover: string;
  /** Luz atrás do carro e contorno claro (feat/carros A3; lib/drivers.ts). */
  light?: { glow: string; glowOpacity: number; rim: string };
  /** Texto do topo (frase + curiosidades), revelado pela passagem do carro. */
  children?: ReactNode;
  className?: string;
};


// Carro no topo da página do piloto + o texto que ele revela (feat/carros A1/A2).
//
// UM relógio (lib/car-motion.ts): t linear de 0 a 1 em car.duration s. Cada camada é uma função dele: posição (curva
// car.ease, ease-out quint, sem passar do ponto), skew de velocidade, fantasma (cópia do MESMO carro com desfoque
// ESTÁTICO, atrás e atrasado, que converge até car.ghostUntil e some), sombra (mesma curva) e o painel que revela o texto
// (borda dianteira do carro no desktop; de cima para baixo no celular). As funções viram keyframes amostrados e cada camada
// roda como animação WAAPI com o MESMO instante de início (document.timeline): o compositor executa tudo junto, sem
// escrita de estilo por quadro na thread principal e sem leitura de layout. Só transform e opacity.
// Disparo: car.afterSignature s depois do início da assinatura, com a imagem decodificada (img.decode(), sem atraso
// artificial) e o slot na tela (no celular ele fica abaixo da foto). Depois de assentar, no desktop com mouse, inclina
// até car.tiltMax° seguindo o ponteiro (spring do motion, com rampa de car.tiltRamp s). Animação sempre ligada.
/** Milissegundos até o instante `at` (performance.now), nunca negativo. */
const msUntil = (at: number) => Math.max(0, at - performance.now());

export function DriverCar({ src, width, height, facing, cue, blur, sizes, cover, light, children, className = "" }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const signatureStarted = useCue(cue, 4000);
  const signatureAt = useRef<number | null>(null);
  const [decoded, setDecoded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<"pending" | "in" | "done">("pending");

  const dir = facing === "right" ? 1 : -1;
  // Largura do carro em fração da largura do slot (o slot é 5:1).
  const carWidth = width / height / 5;

  const options = { dir: dir as 1 | -1, carWidth };
  // Estado inicial (t = 0), já no HTML do servidor: o carro fora do slot, do lado de trás.
  const initial = carClock(0, options);
  const moveRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const coverRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  // Inclinação com o mouse (depois de parar): alvo → spring → rampa.
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springX = useSpring(tiltX, { stiffness: 140, damping: 20, mass: 0.6 });
  const springY = useSpring(tiltY, { stiffness: 140, damping: 20, mass: 0.6 });
  const ramp = useMotionValue(0);
  const tiltTransform = useTransform(() => {
    const a = ramp.get();
    return `rotateY(${(springX.get() * car.tiltMax * a).toFixed(3)}deg) rotateX(${(-springY.get() * car.tiltMax * 0.6 * a).toFixed(3)}deg)`;
  });

  // 1) quando a assinatura começa
  useEffect(() => {
    if (signatureStarted && signatureAt.current === null) signatureAt.current = performance.now();
  }, [signatureStarted]);

  // 2) imagem decodificada (se já estiver, resolve na hora)
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    let alive = true;
    const done = () => alive && setDecoded(true);
    if (img.complete && img.naturalWidth) img.decode().then(done, done);
    else img.addEventListener("load", () => img.decode().then(done, done), { once: true });
    img.addEventListener("error", done, { once: true });
    return () => {
      alive = false;
    };
  }, []);

  // 3) slot na tela
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 4) o relógio: todas as camadas com o mesmo início e a mesma duração (uma vez só; a trava evita recomeçar)
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !signatureStarted || signatureAt.current === null || !decoded || !visible) return;
    const wait = msUntil(signatureAt.current + car.afterSignature * 1000);
    // Aquece as camadas durante a espera (raster do carro e do fantasma desfocado antes de andar): sem isso, o primeiro
    // quadro em movimento pagava o raster e atrasava. O will-change sai no fim (data-state="done").
    slotRef.current?.classList.add("is-ready");
    stageRef.current?.classList.add("is-ready");
    const animations: Animation[] = [];
    const timer = window.setTimeout(() => {
      started.current = true;
      const frames = carKeyframes(options);
      const mobile = window.matchMedia("(max-width: 767.98px)").matches;
      const timing: KeyframeAnimationOptions = { duration: car.duration * 1000, easing: "linear", fill: "both" };
      const layers: [Element | null, Keyframe[]][] = [
        [moveRef.current, frames.move],
        [ghostRef.current, frames.ghost],
        [shadowRef.current, frames.shadow],
        [coverRef.current, mobile ? frames.coverY : frames.coverX],
        [glowRef.current, frames.glow],
      ];
      // Criadas na mesma tarefa, as animações recebem o MESMO instante de início do navegador (no primeiro quadro em que
      // o compositor as recebe): um relógio só, sem "alcançar" um início no passado.
      for (const [el, keyframes] of layers) if (el) animations.push(el.animate(keyframes, timing));
      performance.mark("apex:carro-inicio");
      setState("in");
      animations[0]?.finished.then(
        () => {
          performance.mark("apex:carro-fim");
          // estado final fixo no estilo e as animações liberadas (sem camadas sobrando)
          for (const animation of animations) {
            try {
              animation.commitStyles();
            } catch {}
            animation.cancel();
          }
          setState("done");
        },
        () => {},
      );
    }, wait);
    return () => window.clearTimeout(timer);
    // `options` é derivado das props (estável por página)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatureStarted, decoded, visible]);

  // 5) inclinação: só desktop com mouse, depois de parar, com rampa curta (sem salto)
  useEffect(() => {
    const slot = slotRef.current;
    if (state !== "done" || !slot) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)").matches) return;
    const rampControls = animate(ramp, 1, { duration: car.tiltRamp, ease: car.ease });
    let idle = 0;
    const onMove = (event: PointerEvent) => {
      const box = slot.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      tiltX.set(Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2))));
      tiltY.set(Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2))));
      slot.classList.add("is-tilting");
      window.clearTimeout(idle);
      idle = window.setTimeout(() => slot.classList.remove("is-tilting"), 800);
    };
    const onLeave = () => {
      tiltX.set(0);
      tiltY.set(0);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      rampControls.stop();
      window.clearTimeout(idle);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [state, ramp, tiltX, tiltY]);

  const image = (ref?: Ref<HTMLImageElement>) => (
    <Image
      ref={ref}
      src={src}
      alt=""
      fill
      sizes={sizes}
      quality={90}
      loading="eager"
      fetchPriority="high"
      className="object-contain"
      {...(blur && ref ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
    />
  );

  return (
    <div
      ref={stageRef}
      data-state={state}
      data-facing={facing}
      className={`driver-stage ${className}`}
      style={{ "--cover": cover, "--reveal-edge": `${car.revealEdge}px` } as CSSProperties}
    >
      <div
        ref={slotRef}
        aria-hidden="true"
        data-state={state}
        data-facing={facing}
        className="driver-car"
        style={{ "--car-ratio": `${width} / ${height}`, "--ghost-blur": `${car.ghostBlur}px`, ...(light ? { "--car-glow": light.glow, "--car-glow-opacity": light.glowOpacity, "--car-rim": light.rim } : {}) } as CSSProperties}
      >
        {light && <span ref={glowRef} className="driver-car__glow" />}
        <div ref={moveRef} className="driver-car__move" style={{ transform: carTransforms.move(initial) }}>
          <span ref={shadowRef} className="driver-car__shadow" style={{ transform: carTransforms.shadow(initial), opacity: initial.shadowOpacity }} />
          <div ref={ghostRef} className="driver-car__ghost" style={{ transform: carTransforms.ghost(initial), opacity: initial.ghostOpacity }}>
            <div className="driver-car__ghost-blur">{image()}</div>
          </div>
          <motion.div ref={tiltRef} className="driver-car__tilt" style={{ transform: tiltTransform }}>
            <div className={light ? "driver-car__lit" : "absolute inset-0"}>{image(imgRef)}</div>
          </motion.div>
        </div>
      </div>
      {children && (
        <div className="driver-stage__text">
          {children}
          <span ref={coverRef} aria-hidden="true" className="driver-stage__cover" />
        </div>
      )}
      <noscript>
        <style>{".driver-stage__cover{display:none!important}.driver-car__move{transform:none!important}.driver-car__ghost{display:none!important}"}</style>
      </noscript>
    </div>
  );
}
