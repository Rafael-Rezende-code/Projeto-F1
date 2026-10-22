import type { SocialNetwork } from "@/lib/social";

// Ícones simples (traço, no estilo do lucide) das redes da loja: o lucide-react atual não traz marcas.
export function SocialIcon({ network, size = 16 }: { network: SocialNetwork; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;
  if (network === "instagram")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
      </svg>
    );
  if (network === "youtube")
    return (
      <svg {...common}>
        <rect x="2" y="5" width="20" height="14" rx="4" />
        <path d="M10 9.2v5.6l4.8-2.8z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M14.5 3v10.6a3.6 3.6 0 1 1-3.6-3.6" />
      <path d="M14.5 3c.3 2.3 1.9 3.9 4.5 4.2" />
    </svg>
  );
}
