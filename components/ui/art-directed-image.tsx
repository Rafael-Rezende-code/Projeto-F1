import { getImageProps } from "next/image";

import { cn } from "@/lib/utils";

/** Uma versão da foto (arquivo) com seu enquadramento e `sizes`. */
export type ArtSource = {
  src: string;
  /** object-position desta versão (ex.: "50% 22%"). */
  position: string;
  /** Largura real da área da foto em cada breakpoint (o navegador multiplica pelo DPR). */
  sizes: string;
};

type ArtDirectedImageProps = {
  alt: string;
  /** Versão do celular e do tablet (até o breakpoint `lg`, 1024px). */
  mobile: ArtSource;
  /** Versão do desktop (a partir de `lg`, 1024px). Sem ela, a versão mobile vale em todas as telas. */
  desktop?: ArtSource;
  quality?: number;
  className?: string;
  /** Foto principal acima da dobra: carrega já (loading eager + fetchPriority high). Sem <link preload>: com <picture>
   *  o preload baixaria as duas versões. */
  eager?: boolean;
};

/**
 * Direção de arte por breakpoint com <picture>: o navegador escolhe UMA das fontes e baixa só ela
 * (não é CSS escondendo uma imagem já baixada). Os srcsets vêm do otimizador do Next (getImageProps).
 *
 * O breakpoint é o `lg` do Tailwind (1024px); se mudar aqui, mude também `lg:` na className abaixo.
 */
const DESKTOP_MIN_WIDTH = 1024;

export function ArtDirectedImage({ alt, mobile, desktop, quality = 90, className, eager = false }: ArtDirectedImageProps) {
  const common = { alt, fill: true, quality, ...(eager ? { loading: "eager" as const, fetchPriority: "high" as const } : {}) };
  const { props: mobileProps } = getImageProps({ ...common, src: mobile.src, sizes: mobile.sizes });
  const desktopProps = desktop ? getImageProps({ ...common, src: desktop.src, sizes: desktop.sizes }).props : null;

  return (
    <picture>
      {desktopProps && (
        <source media={`(min-width: ${DESKTOP_MIN_WIDTH}px)`} srcSet={desktopProps.srcSet} sizes={desktop!.sizes} />
      )}
      <img
        {...mobileProps}
        alt={alt}
        className={cn("[object-position:var(--pos-mobile)] lg:[object-position:var(--pos-desktop)]", className)}
        style={{
          ...mobileProps.style,
          "--pos-mobile": mobile.position,
          "--pos-desktop": (desktop ?? mobile).position,
        } as React.CSSProperties}
      />
    </picture>
  );
}
