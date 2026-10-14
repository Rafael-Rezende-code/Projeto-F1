// Esqueletos de carregamento (loading.tsx): mesma grade e proporções das páginas reais.
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul role="list" aria-hidden="true" className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-5">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="apex-skeleton aspect-[4/5] rounded-2xl" />
          <div className="apex-skeleton mt-4 h-2.5 w-16 rounded-md" />
          <div className="apex-skeleton mt-2 h-4 w-3/4 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

export function PageSkeleton() {
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10" role="status" aria-label="Carregando">
      <div className="mx-auto max-w-[1400px]">
        <div className="apex-skeleton h-3 w-40 rounded-md" />
        <div className="apex-skeleton mt-10 h-3 w-24 rounded-md" />
        <div className="apex-skeleton mt-4 h-12 w-2/3 max-w-lg rounded-xl" />
        <div className="mt-14">
          <ProductGridSkeleton />
        </div>
      </div>
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10" role="status" aria-label="Carregando produto">
      <div className="mx-auto max-w-[1400px]">
        <div className="apex-skeleton h-3 w-56 rounded-md" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
          <div className="apex-skeleton aspect-[4/5] rounded-2xl" />
          <div>
            <div className="apex-skeleton h-3 w-24 rounded-md" />
            <div className="apex-skeleton mt-4 h-12 w-4/5 rounded-xl" />
            <div className="apex-skeleton mt-6 h-7 w-32 rounded-md" />
            <div className="mt-10 flex gap-2">
              {Array.from({ length: 4 }, (_, i) => <div key={i} className="apex-skeleton h-12 w-14 rounded-xl" />)}
            </div>
            <div className="apex-skeleton mt-6 h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
