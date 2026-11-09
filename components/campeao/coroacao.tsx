"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { CampeaoSelo } from "@/components/campeao/selo";
import { PlayWhenVisible } from "@/components/campeao/play-when-visible";
import { CAMPEAO_IMAGES, COROACAO, CROWN_SIZES, STAGE_SIZES, coroacaoFrame, type CampeaoImage } from "@/lib/campeao";

// A COROAÇÃO (Sessão do Campeão). Porta em React do protótipo docs/referencia/coroacao/index.html, com os MESMOS valores
// (lib/campeao.ts → COROACAO). Nada é desenhado em código: rosto, coroa e mãos são as camadas fornecidas; o brilho usa a
// máscara gerada da própria camada (scripts/images/campeao.mjs). CSS em app/globals.css (bloco "Sessão do Campeão").
//
// <CoroacaoCena>: seção de 320svh com um filho fixo (sticky) de 100svh; p = progresso da rolagem dentro da seção (0–1),
//   nos dois sentidos. Só escuta a rolagem quando a seção está perto da tela (IntersectionObserver); a posição da seção é
//   medida no resize (sem leitura de layout por quadro). p alimenta motion values (useTransform): só transform/opacity.
//   O encaixe (p ≥ 0,58: assentar, brilho e "ON") e o selo (p ≥ 0,72) são estados discretos, reversíveis.
//   Respeita prefers-reduced-motion (move a tela inteira com a rolagem; regra do CLAUDE.md): fica na composição final,
//   estática, e a seção tem a altura da tela.
// <CoroacaoCapa>: a composição final, estática (capa da home), com o brilho dourado em loop leve e o botão "Coroar o Kimi".

function Picture({ image, sizes, className, imgRef, priority, alt = "" }: { image: CampeaoImage; sizes: string; className?: string; imgRef?: React.Ref<HTMLImageElement>; priority?: boolean; alt?: string }) {
  return (
    <picture>
      <source type="image/avif" srcSet={image.avif} sizes={sizes} />
      <source type="image/webp" srcSet={image.webp} sizes={sizes} />
      <img
        ref={imgRef}
        src={image.fallback}
        alt={alt}
        width={image.width}
        height={image.height}
        className={className}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        draggable={false}
      />
    </picture>
  );
}

type StageProps = {
  /** Estado discreto */
  typed: string;
  seated: boolean;
  seal: boolean;
  hint: boolean;
  /** Valores contínuos (motion values na cena; fixos na capa) */
  kimiStyle?: { opacity: MotionValue<number> | number; transform: MotionValue<string> | string };
  crownTransform: MotionValue<string> | string;
  shadowStyle: { opacity: MotionValue<number> | number; transform: MotionValue<string> | string };
  headingLevel: "h1" | "h2";
  loopShine?: boolean;
  faceRef?: React.Ref<HTMLImageElement>;
  crownRef?: React.Ref<HTMLImageElement>;
  ready: boolean;
  /** Conteúdo extra na faixa de cima do celular e no canto do palco (botão da capa). */
  action?: ReactNode;
  priority?: boolean;
};

function Stage({ typed, seated, seal, hint, kimiStyle, crownTransform, shadowStyle, headingLevel, loopShine, faceRef, crownRef, ready, action, priority }: StageProps) {
  const Heading = headingLevel;
  return (
    <div className="campeao-fixo" data-ready={ready || undefined}>
      {/* Celular: faixa vazia de cima (acima do palco ancorado embaixo) com o selo maior, a dica e a ação. */}
      <div className="campeao-faixa md:hidden">
        {hint && <Hint />}
        <CampeaoSelo visible={seal} className="campeao-selo-faixa" />
        {action && <div className="campeao-acao-faixa">{action}</div>}
      </div>
      <div className="hidden md:contents">{hint && <Hint />}</div>

      <div className="campeao-palco">
        <Picture image={CAMPEAO_IMAGES.face} sizes={STAGE_SIZES} className="campeao-rosto" imgRef={faceRef} priority={priority} />

        <Heading className="campeao-titulo" aria-label="The Champion. Kimi">
          <small aria-hidden="true" className="font-campeao-mono">
            <span>{typed}</span>
            <span className={`campeao-fim ${seated ? "is-pouso" : ""}`} key={seated ? "on" : "dots"}>
              {seated ? (
                COROACAO.ending.split("").map((letter) => <span key={letter}>{letter}</span>)
              ) : (
                <>
                  <span className="campeao-cursor">.</span>
                  <span className="campeao-cursor">.</span>
                </>
              )}
            </span>
          </small>
          <motion.b aria-hidden="true" style={kimiStyle}>
            Kimi
          </motion.b>
        </Heading>

        <motion.div className="campeao-sombra" style={shadowStyle} />

        <motion.div className="campeao-coroa" style={{ transform: crownTransform }}>
          <div className={`campeao-assenta ${seated ? "is-pouso" : ""} ${loopShine ? "is-loop" : ""}`}>
            <Picture image={CAMPEAO_IMAGES.crown} sizes={CROWN_SIZES} imgRef={crownRef} priority={priority} />
            <div className="campeao-brilho" style={{ "--mascara": `url("${CAMPEAO_IMAGES.goldMask}")` } as CSSProperties}>
              <i />
            </div>
          </div>
        </motion.div>

        <CampeaoSelo visible={seal} className="campeao-selo-palco hidden md:block" />
        {action && <div className="campeao-acao-palco hidden md:block">{action}</div>}
      </div>
    </div>
  );
}

function Hint() {
  return (
    <div className="campeao-dica font-campeao-mono" aria-hidden="true">
      {COROACAO.hint} <i />
    </div>
  );
}

/** Espera as camadas decodificarem antes de mostrar a coroa (sem "pipocar" no meio da descida). */
function useDecoded() {
  const faceRef = useRef<HTMLImageElement>(null);
  const crownRef = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const decode = (img: HTMLImageElement | null) => (img ? img.decode().catch(() => undefined) : Promise.resolve());
    const failsafe = window.setTimeout(() => alive && setReady(true), 6000);
    Promise.all([decode(faceRef.current), decode(crownRef.current)]).then(() => alive && setReady(true));
    return () => {
      alive = false;
      window.clearTimeout(failsafe);
    };
  }, []);
  return { faceRef, crownRef, ready };
}

const reducedQuery = "(prefers-reduced-motion: reduce)";

export function CoroacaoCena({ headingLevel = "h1" }: { headingLevel?: "h1" | "h2" }) {
  const sectionRef = useRef<HTMLElement>(null);
  const p = useMotionValue(0);
  const { faceRef, crownRef, ready } = useDecoded();
  const [reduced, setReduced] = useState(false);
  const [state, setState] = useState(() => {
    const f = coroacaoFrame(0);
    return { typed: f.typed, seated: f.seated, seal: f.seal, hint: f.hint };
  });

  useEffect(() => {
    const media = window.matchMedia(reducedQuery);
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || reduced) return;
    let top = 0;
    let total = 1;
    let frame = 0;
    let listening = false;
    const measure = () => {
      const rect = section.getBoundingClientRect();
      top = rect.top + window.scrollY;
      total = Math.max(1, section.offsetHeight - window.innerHeight);
    };
    const update = () => {
      frame = 0;
      p.set(Math.min(1, Math.max(0, (window.scrollY - top) / total)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    update();
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !listening) {
          listening = true;
          measure();
          window.addEventListener("scroll", onScroll, { passive: true });
          onScroll();
        } else if (!entry.isIntersecting && listening) {
          listening = false;
          window.removeEventListener("scroll", onScroll);
          update(); // assenta em 0 ou 1 ao sair
        }
      },
      { rootMargin: "50% 0px 50% 0px" },
    );
    observer.observe(section);
    const resize = new ResizeObserver(onResize);
    resize.observe(section);
    window.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [p, reduced]);

  useMotionValueEvent(p, "change", (value) => {
    const f = coroacaoFrame(value);
    setState((prev) =>
      prev.typed === f.typed && prev.seated === f.seated && prev.seal === f.seal && prev.hint === f.hint
        ? prev
        : { typed: f.typed, seated: f.seated, seal: f.seal, hint: f.hint },
    );
  });

  const kimiOpacity = useTransform(p, (value) => coroacaoFrame(value).kimiOpacity);
  const kimiTransform = useTransform(p, (value) => `translate3d(0,${coroacaoFrame(value).kimiY}cqw,0)`);
  const crownTransform = useTransform(p, (value) => {
    const f = coroacaoFrame(value);
    return `translate3d(0,${f.crownY}%,0) rotate(${f.crownRotate}deg) scale(${f.crownScale})`;
  });
  const shadowOpacity = useTransform(p, (value) => coroacaoFrame(value).shadowOpacity);
  const shadowTransform = useTransform(p, (value) => `scale(${coroacaoFrame(value).shadowScale})`);

  if (reduced) {
    // Movimento reduzido: composição final, parada, na altura da tela.
    return (
      <section ref={sectionRef} className="campeao-cena is-estatica" aria-label="A coroação">
        <StaticStage headingLevel={headingLevel} faceRef={faceRef} crownRef={crownRef} ready={ready} priority />
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="campeao-cena" aria-label="A coroação" data-seated={state.seated || undefined}>
      <Stage
        {...state}
        kimiStyle={{ opacity: kimiOpacity, transform: kimiTransform }}
        crownTransform={crownTransform}
        shadowStyle={{ opacity: shadowOpacity, transform: shadowTransform }}
        headingLevel={headingLevel}
        faceRef={faceRef}
        crownRef={crownRef}
        ready={ready}
        priority
      />
    </section>
  );
}

function StaticStage({ headingLevel, loopShine, action, faceRef, crownRef, ready, priority }: { headingLevel: "h1" | "h2"; loopShine?: boolean; action?: ReactNode; faceRef?: React.Ref<HTMLImageElement>; crownRef?: React.Ref<HTMLImageElement>; ready: boolean; priority?: boolean }) {
  const f = coroacaoFrame(1);
  return (
    <Stage
      typed={f.typed}
      seated
      seal
      hint={false}
      kimiStyle={{ opacity: 1, transform: "none" }}
      crownTransform="none"
      shadowStyle={{ opacity: 1, transform: "none" }}
      headingLevel={headingLevel}
      loopShine={loopShine}
      action={action}
      faceRef={faceRef}
      crownRef={crownRef}
      ready={ready}
      priority={priority}
    />
  );
}

/** Capa da home: composição final, estática, brilho em loop leve e o botão para a página do campeão. */
export function CoroacaoCapa({ href = "/campeao", label = "Coroar o Kimi" }: { href?: string; label?: string }) {
  // Capa estática: nada se move, então não espera a decodificação (decode() anteciparia as imagens lazy e disputaria
  // banda com o hero). Fontes também só perto da tela (CSS .campeao-capa[data-pausado]).
  const action = (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0d0d0d] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#b88a2c] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
    >
      {label} <span aria-hidden="true">→</span>
    </Link>
  );
  return (
    <PlayWhenVisible as="section" className="campeao-capa" aria-label="Kimi Antonelli, campeão mundial 2026">
      <StaticStage headingLevel="h2" loopShine action={action} ready />
    </PlayWhenVisible>
  );
}
