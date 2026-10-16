// Imagens do hero (app/page.tsx e components/spotlight.tsx), servidas pelo next/image em AVIF/WebP.
// As fotos são 3:2 e usam object-cover na altura da tela: em telas mais estreitas que 3:2 a foto ocupa 150vh de
// largura (cobre a altura); nas mais largas, 100vw. q90: sem perda visível nas texturas do carro.
export const HERO_SIZES = "(max-aspect-ratio: 3/2) 150vh, 100vw";
export const HERO_QUALITY = 90;

// Fonte do hero depois do primeiro quadro COM CONTEÚDO (ver .hero-type no globals.css): espera o evento
// first-contentful-paint (PerformanceObserver), com limite de 3 s, e injeta no <head> um <style> com :root{--hero-font}.
// Não usa atributo do <html> (style/className): o React compara os dois na hidratação e acusava divergência; tags
// inseridas no <head> por scripts são ignoradas pelo React 19. requestAnimationFrame não serve: os primeiros quadros
// saem sem texto visível (bloqueio curto das outras fontes) e a Inter começava a baixar antes do primeiro quadro.
export const HERO_FONT_CSS = ":root{--hero-font:var(--font-hero)}";
export const HERO_FONT_SCRIPT =
  "(function(){window.__heroFont=1;var d=0;function go(){if(d)return;d=1;var s=document.createElement('style');s.textContent='" + HERO_FONT_CSS + "';document.head.appendChild(s)}" +
  "try{new PerformanceObserver(function(l){if(l.getEntriesByName('first-contentful-paint').length)setTimeout(go,0)}).observe({type:'paint',buffered:true})}catch(e){go()}" +
  "setTimeout(go,3000)})()";
