// Cabeçalho de página interna no padrão das seções da home (rótulo laranja + título grande).
export function PageIntro({ eyebrow, title, body, children }: { eyebrow: string; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">{eyebrow}</p>
      <h1 className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl md:text-6xl">{title}</h1>
      {body && <p className="mt-5 max-w-xl text-sm leading-7 text-black/55 sm:text-base">{body}</p>}
      {children}
    </div>
  );
}
