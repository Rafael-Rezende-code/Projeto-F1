// Imagens do hero (app/page.tsx e components/spotlight.tsx), servidas pelo next/image em AVIF/WebP.
// As fotos são 3:2 e usam object-cover na altura da tela: em telas mais estreitas que 3:2 a foto ocupa 150vh de
// largura (cobre a altura); nas mais largas, 100vw. q90: sem perda visível nas texturas do carro.
export const HERO_SIZES = "(max-aspect-ratio: 3/2) 150vh, 100vw";
export const HERO_QUALITY = 90;
