"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, Minus, Plus, X } from "lucide-react";
import { SharedTransition } from "@/components/motion/view-transition";
import { useModal } from "@/components/use-modal";
import type { ProductImage } from "@/lib/catalog/types";

// Galeria da página de produto (refino 3, item 2.1).
// - Foto principal: troca com crossfade (só opacidade); no desktop com mouse, LUPA ao passar o mouse (uma cópia em alta
//   resolução, carregada no primeiro hover, ampliada 2× a partir do ponto do cursor; só transform). Clique/Enter abre a
//   tela cheia. A foto recebe a View Transition vinda do card.
// - Miniaturas: grupo com seleção por teclado (← → Home End; tabindex móvel) e `aria-current` na escolhida.
// - Tela cheia (diálogo modal, foco preso, Esc fecha): setas e ← →; no toque, PINÇA para ampliar (até 4×), arrastar para
//   mover a foto ampliada e deslizar para trocar quando não está ampliada; duplo toque/clique alterna 2×; + e − também.
//   Os gestos escrevem o transform direto no elemento (sem re-render a cada quadro).
const MAIN_SIZES = "(min-width: 1480px) 680px, (min-width: 1024px) calc((100vw - 80px) * 0.55), calc(100vw - 40px)";
// A lupa amplia 2×: a cópia pede o dobro da largura da foto principal.
const LENS_SIZES = "(min-width: 1480px) 1360px, (min-width: 1024px) calc((100vw - 80px) * 1.1), 200vw";
const LENS_SCALE = 2;
const MAX_ZOOM = 4;

export function ProductGallery({ images, name, transitionName }: { images: ProductImage[]; name: string; transitionName?: string }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [lensReady, setLensReady] = useState(false);
  // A 1ª foto NÃO anima ao carregar (é a LCP da página): o crossfade só vale a partir da primeira troca.
  const [changed, setChanged] = useState(false);
  const select = (index: number) => {
    setChanged(true);
    setActive(index);
  };
  const panelRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useModal(open, panelRef, close);
  const current = images[active] ?? images[0];
  const many = images.length > 1;
  const step = (delta: number) => {
    setChanged(true);
    setActive((index) => (index + delta + images.length) % images.length);
  };

  // Lupa: só com mouse de verdade (hover + ponteiro fino); posição em % do quadro, escrita direto no estilo.
  const canLens = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const moveLens = (event: PointerEvent<HTMLElement>) => {
    const lens = lensRef.current;
    if (!lens || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    lens.style.transformOrigin = `${x}% ${y}%`;
  };

  const onThumbKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: active + 1, ArrowDown: active + 1, ArrowLeft: active - 1, ArrowUp: active - 1, Home: 0, End: images.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = (keys[event.key] + images.length) % images.length;
    select(next);
    thumbsRef.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-3">
      <SharedTransition name={transitionName}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          onPointerEnter={(event) => event.pointerType === "mouse" && canLens() && setLensReady(true)}
          onPointerMove={moveLens}
          aria-label={`Ampliar foto em tela cheia: ${current.alt}`}
          data-fly-image
          className="group relative isolate aspect-[4/5] cursor-zoom-in overflow-hidden rounded-2xl bg-[#e9e8e4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
        >
          <Image key={current.src} src={current.src} alt={current.alt} fill priority sizes={MAIN_SIZES} quality={85} className={`${changed ? "gallery-fade " : ""}object-cover`} />
          {/* Lupa: aparece por opacidade no hover; a origem do zoom segue o cursor. */}
          {lensReady && (
            <div ref={lensRef} aria-hidden="true" className="gallery-lens pointer-events-none absolute inset-0" style={{ transform: `scale(${LENS_SCALE})` }}>
              <Image key={`lens-${current.src}`} src={current.src} alt="" fill sizes={LENS_SIZES} quality={90} className="object-cover" />
            </div>
          )}
          <span aria-hidden="true" className="absolute bottom-3 right-3 rounded-xl bg-white/85 p-2 text-black opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Expand size={16} />
          </span>
        </button>
      </SharedTransition>
      {many && (
        <div ref={thumbsRef} className="flex gap-3" role="group" aria-label={`Imagens de ${name} (use as setas para trocar)`} onKeyDown={onThumbKey}>
          {images.map((image, index) => (
            <button
              key={image.src + index}
              type="button"
              onClick={() => select(index)}
              tabIndex={index === active ? 0 : -1}
              aria-label={`Ver imagem ${index + 1} de ${images.length}`}
              aria-current={index === active ? "true" : undefined}
              className={`relative aspect-square w-20 overflow-hidden rounded-xl bg-[#e9e8e4] outline-offset-2 transition-opacity focus-visible:outline-2 focus-visible:outline-black sm:w-24 ${index === active ? "opacity-100 outline-2 outline-black" : "opacity-70 hover:opacity-100"}`}
            >
              <Image src={image.src} alt="" fill sizes="96px" quality={75} className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && <Lightbox images={images} name={name} active={active} setActive={select} step={step} panelRef={panelRef} onClose={close} />}
    </div>
  );
}

function Lightbox({
  images,
  name,
  active,
  setActive,
  step,
  panelRef,
  onClose,
}: {
  images: ProductImage[];
  name: string;
  active: number;
  setActive: (index: number) => void;
  step: (delta: number) => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const current = images[active] ?? images[0];
  const many = images.length > 1;
  const stageRef = useRef<HTMLDivElement>(null);
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ distance: number; scale: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const [zoomed, setZoomed] = useState(false);

  const apply = (animate = false) => {
    const el = stageRef.current;
    if (!el) return;
    const { scale, x, y } = view.current;
    el.style.transition = animate ? "transform var(--motion-medium) var(--ease-out)" : "none";
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    setZoomed(scale > 1.01);
  };
  const setScale = (scale: number, animate = true) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, scale));
    view.current = next === 1 ? { scale: 1, x: 0, y: 0 } : { ...view.current, scale: next };
    apply(animate);
  };

  // Trocar de foto sempre volta ao tamanho normal.
  useEffect(() => {
    view.current = { scale: 1, x: 0, y: 0 };
    apply();
  }, [active]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const list = [...pointers.current.values()];
    gesture.current = {
      distance: list.length === 2 ? Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y) : 0,
      scale: view.current.scale,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.current.x,
      originY: view.current.y,
      moved: false,
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const list = [...pointers.current.values()];
    const g = gesture.current;
    if (list.length === 2 && g.distance > 0) {
      // pinça
      const distance = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y);
      view.current.scale = Math.min(MAX_ZOOM, Math.max(1, g.scale * (distance / g.distance)));
      g.moved = true;
      apply();
    } else if (list.length === 1) {
      const dx = event.clientX - g.startX;
      const dy = event.clientY - g.startY;
      if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true;
      if (view.current.scale > 1) {
        // arrastar a foto ampliada
        view.current.x = g.originX + dx;
        view.current.y = g.originY + dy;
        apply();
      }
    }
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    pointers.current.delete(event.pointerId);
    if (!g) return;
    if (pointers.current.size > 0) {
      // sobrou um dedo depois da pinça: recomeça o arrasto a partir dele
      const [rest] = [...pointers.current.values()];
      gesture.current = { ...g, distance: 0, scale: view.current.scale, startX: rest.x, startY: rest.y, originX: view.current.x, originY: view.current.y };
      return;
    }
    gesture.current = null;
    const dx = event.clientX - g.startX;
    if (view.current.scale <= 1.01) {
      setScale(1);
      // deslizar troca de foto (sem zoom)
      if (many && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(event.clientY - g.startY)) step(dx < 0 ? 1 : -1);
    }
    if (!g.moved) {
      // duplo toque/clique alterna 2×
      const now = Date.now();
      if (now - lastTap.current < 300) setScale(view.current.scale > 1.01 ? 1 : 2);
      lastTap.current = now;
    }
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${name}`}
      className="fixed inset-0 z-[97] flex flex-col bg-black/95 text-white [color-scheme:dark]"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") step(1);
        if (event.key === "ArrowLeft") step(-1);
        if (event.key === "+" || event.key === "=") setScale(view.current.scale + 1);
        if (event.key === "-") setScale(view.current.scale - 1);
      }}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <p className="text-sm text-white/70" aria-live="polite">
          {active + 1} / {images.length}
        </p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setScale(view.current.scale - 1)} disabled={!zoomed} aria-label="Diminuir zoom" className="rounded-xl p-2 transition hover:bg-white/10 disabled:opacity-30">
            <Minus size={20} strokeWidth={1.5} />
          </button>
          <button type="button" onClick={() => setScale(view.current.scale + 1)} aria-label="Aumentar zoom" className="rounded-xl p-2 transition hover:bg-white/10">
            <Plus size={20} strokeWidth={1.5} />
          </button>
          <button type="button" data-autofocus onClick={onClose} aria-label="Fechar fotos" className="rounded-xl p-2 transition hover:bg-white/10">
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div
        className={`relative min-h-0 flex-1 touch-none select-none overflow-hidden ${zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={stageRef} className="absolute inset-0 will-change-transform">
          <Image key={current.src} src={current.src} alt={current.alt} fill sizes="100vw" quality={90} draggable={false} className="gallery-fade object-contain" />
        </div>
        {many && (
          <>
            <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => step(-1)} aria-label="Foto anterior" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl bg-white/10 p-3 backdrop-blur transition hover:bg-white/20">
              <ChevronLeft size={22} />
            </button>
            <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => step(1)} aria-label="Próxima foto" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-white/10 p-3 backdrop-blur transition hover:bg-white/20">
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>
      {many && (
        <div className="flex justify-center gap-2 px-5 py-3" role="group" aria-label="Escolher foto">
          {images.map((image, index) => (
            <button
              key={image.src + index}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Foto ${index + 1}`}
              aria-current={index === active ? "true" : undefined}
              className={`relative size-12 overflow-hidden rounded-lg transition-opacity ${index === active ? "opacity-100 outline-2 outline-offset-2 outline-white" : "opacity-50 hover:opacity-100"}`}
            >
              <Image src={image.src} alt="" fill sizes="48px" quality={60} className="object-cover" />
            </button>
          ))}
        </div>
      )}
      <p className="px-5 pb-4 text-center text-xs text-white/60">{current.alt}</p>
    </div>
  );
}
