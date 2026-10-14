'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { ShoppingBag } from 'lucide-react'
import { CartDrawer } from '@/components/cart-drawer'
import { CART_STORAGE_KEY } from '@/lib/cart/config'
import { cartCount, cartReducer, cartSubtotal, initialCartState, type CartItem } from '@/lib/cart/reducer'
import type { Product, ProductVariant } from '@/lib/catalog/types'

// Sacola: estado no cliente (context + reducer), persistido no localStorage, um item por variante (produto + tamanho).
// Só estes pequenos componentes são client; o resto da página é server component.
type CartContextValue = {
  items: CartItem[]
  count: number
  subtotalCents: number
  /** true depois de ler o localStorage (antes disso a sacola aparece vazia, igual ao HTML do servidor). */
  ready: boolean
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void
  setQuantity: (sku: string, quantity: number) => void
  removeItem: (sku: string) => void
  clear: () => void
  isOpen: boolean
  open: () => void
  close: () => void
}
const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart precisa estar dentro de <CartProvider>')
  return value
}

function readStorage(): unknown {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeStorage(items: CartItem[]) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // modo privado, cota cheia ou armazenamento bloqueado: a sacola segue só na memória
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState)
  const [notice, setNotice] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const noticeTimer = useRef<number | undefined>(undefined)

  // Lê a sacola salva só depois de montar (o HTML do servidor não conhece o localStorage: evita hydration mismatch).
  useEffect(() => {
    dispatch({ type: 'hydrate', items: readStorage() as CartItem[] })
    // Outra aba alterou a sacola: acompanha.
    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) dispatch({ type: 'hydrate', items: readStorage() as CartItem[] })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const ready = state.hydrated
  useEffect(() => {
    if (ready) writeStorage(state.items)
  }, [state.items, ready])

  const announce = useCallback((message: string) => {
    setNotice(message)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2600)
  }, [])

  const addItem = useCallback(
    (product: Product, variant: ProductVariant, quantity = 1) => {
      const current = state.items.find((item) => item.sku === variant.sku)?.quantity ?? 0
      const room = variant.stock - current
      if (room <= 0) {
        announce(`Você já tem todas as unidades disponíveis de ${product.name} (${variant.size}) na sacola`)
        return
      }
      dispatch({
        type: 'add',
        quantity,
        item: {
          sku: variant.sku,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          size: variant.size,
          image: product.images[0]?.src ?? '',
          priceCents: product.priceCents,
          stock: variant.stock,
        },
      })
      announce(quantity > room ? `Só havia ${room} unidade(s) de ${product.name}: adicionamos o que restava` : `${product.name} foi adicionado à sacola`)
    },
    [announce, state.items],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      count: cartCount(state),
      subtotalCents: cartSubtotal(state),
      ready,
      addItem,
      setQuantity: (sku, quantity) => dispatch({ type: 'setQuantity', sku, quantity }),
      removeItem: (sku) => dispatch({ type: 'remove', sku }),
      clear: () => dispatch({ type: 'clear' }),
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [state, ready, addItem, isOpen],
  )

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[100] max-w-[calc(100vw-40px)] -translate-x-1/2 rounded-xl bg-black px-5 py-3 text-center text-xs text-white shadow-xl">{notice}</div>}
    </CartContext.Provider>
  )
}

export function CartButton() {
  const { count, open, isOpen } = useCart()
  return <button type="button" onClick={open} aria-haspopup="dialog" aria-expanded={isOpen} aria-controls="sacola" aria-label={count > 0 ? `Sacola de compras, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Sacola de compras'} className="relative transition-opacity hover:opacity-60"><ShoppingBag strokeWidth={1.5} />{count > 0 && <span aria-hidden="true" className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-[#b94f01] text-[9px] text-white">{count > 9 ? '9+' : count}</span>}</button>
}

/** Compra rápida no card (produto de variante única). */
export function AddToCartButton({ product, className }: { product: Product; className?: string }) {
  const { addItem } = useCart()
  const variant = product.variants.find((item) => item.stock > 0)
  return <button type="button" disabled={!variant} onClick={() => variant && addItem(product, variant, 1)} className={className}>Adicionar à sacola</button>
}
