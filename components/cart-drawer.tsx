'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useCart } from '@/components/cart'
import { CartContents } from '@/components/cart-contents'

// Gaveta da sacola (abre pelo botão da sacola no cabeçalho). Diálogo modal: foco preso dentro, Esc fecha,
// clique fora fecha, a página atrás não rola, e o foco volta para quem abriu.
export function CartDrawer() {
  const { isOpen, close, count } = useCart()
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    // Volta o foco para quem abriu; se não havia foco (ex.: toque), para o botão da sacola.
    const active = document.activeElement as HTMLElement | null
    returnFocus.current = active && active !== document.body ? active : document.querySelector<HTMLElement>("[aria-controls=sacola]")
    const panel = panelRef.current
    panel?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      returnFocus.current?.focus?.()
    }
  }, [isOpen, close])

  return (
    <div className={`fixed inset-0 z-[90] ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <div onClick={close} className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} />
      <div
        ref={panelRef}
        id="sacola"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sacola-titulo"
        inert={!isOpen}
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white px-5 pb-5 pt-5 text-black shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-7 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-black/10 pb-4">
          <h2 id="sacola-titulo" className="text-xl font-medium tracking-[-0.04em]">
            Sacola {count > 0 && <span className="text-black/60">({count})</span>}
          </h2>
          <button type="button" data-autofocus onClick={close} aria-label="Fechar sacola" className="rounded-xl p-2 transition hover:bg-black/5">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        {isOpen && <CartContents variant="drawer" onNavigate={close} />}
      </div>
    </div>
  )
}
