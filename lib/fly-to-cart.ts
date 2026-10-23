import { ease, flyToCart as token } from "@/lib/motion";

// "Voar para a sacola" (operação, fase 6): ao adicionar, uma miniatura da foto sai do produto e voa em arco até o ícone
// da sacola (cabeçalho no desktop, dock no celular) em ~0,6 s; ao chegar, o contador pulsa. Só transform e opacity,
// UMA leitura de posição (origem e destino lidos juntos, antes de qualquer escrita) e WAAPI (roda no compositor).
// Sempre ligada (decisão de produto: não some com prefers-reduced-motion). Keyframes puros testados em fly-to-cart.test.ts.
type Point = { x: number; y: number };

export function flyKeyframes(from: Point, to: Point, size = token.size): Keyframe[] {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const lift = Math.min(160, distance * token.arc);
  const at = (t: number, scale: number, opacity: number): Keyframe => {
    // arco: interpolação linear + parábola para cima (máxima no meio)
    const x = from.x + (to.x - from.x) * t - size / 2;
    const y = from.y + (to.y - from.y) * t - lift * 4 * t * (1 - t) - size / 2;
    return { transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale})`, opacity, offset: t };
  };
  return [at(0, 1, 0), at(0.12, 1, 1), at(0.5, 0.75, 1), at(0.85, 0.4, 0.9), at(1, 0.25, 0)];
}

const center = (rect: DOMRect): Point => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
const visible = (rect: DOMRect) => rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;

/** Foto de origem: a do card do botão (data-fly-scope) ou a principal da página de produto. */
function findSourceImage(from: Element | null | undefined) {
  const scoped = from?.closest("[data-fly-scope]")?.querySelector<HTMLImageElement>("[data-fly-image] img");
  return scoped ?? document.querySelector<HTMLImageElement>("[data-fly-image] img");
}

export function flyToCart(from?: Element | null) {
  if (typeof window === "undefined" || typeof Element.prototype.animate !== "function") return;
  const image = findSourceImage(from);
  const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target], [data-dock-id=\"sacola\"]"));
  // leitura única de layout (tudo antes de criar a miniatura)
  const sourceRect = image?.getBoundingClientRect();
  const target = targets.map((el) => ({ el, rect: el.getBoundingClientRect() })).find((item) => visible(item.rect));
  const pulse = () => {
    const badge = target?.el.querySelector<HTMLElement>("[data-cart-count]") ?? target?.el;
    badge?.animate([{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: token.pulse * 1000, easing: `cubic-bezier(${ease.out.join(",")})` });
  };
  if (!image || !sourceRect || !visible(sourceRect) || !image.currentSrc) {
    // sem foto visível (ex.: rolou até a barra fixa): só o pulso
    pulse();
    return;
  }
  const to: Point = target ? center(target.rect) : { x: window.innerWidth - 40, y: 40 };
  const thumb = document.createElement("img");
  thumb.src = image.currentSrc;
  thumb.alt = "";
  thumb.setAttribute("aria-hidden", "true");
  thumb.className = "fly-to-cart";
  document.body.appendChild(thumb);
  const animation = thumb.animate(flyKeyframes(center(sourceRect), to), { duration: token.duration * 1000, easing: `cubic-bezier(${ease.inOut.join(",")})`, fill: "forwards" });
  animation.finished.then(
    () => {
      thumb.remove();
      pulse();
    },
    () => thumb.remove(),
  );
}
