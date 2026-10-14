'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { ShoppingBag } from 'lucide-react'

// Sacola: estado compartilhado entre o botão do cabeçalho, os botões "Adicionar à sacola" dos produtos e o aviso.
// Só estes pequenos componentes são client; o resto da página é server component.
type CartContextValue = { count: number; add: (name: string) => void }
const CartContext = createContext<CartContextValue | null>(null)

function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart precisa estar dentro de <CartProvider>')
  return value
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0)
  const [notice, setNotice] = useState('')
  const add = (name: string) => {
    setCount((current) => current + 1)
    setNotice(`${name} foi adicionado à sacola`)
    window.setTimeout(() => setNotice(''), 2400)
  }
  return (
    <CartContext.Provider value={{ count, add }}>
      {children}
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 bg-black px-5 py-3 text-xs text-white shadow-xl">{notice}</div>}
    </CartContext.Provider>
  )
}

export function CartButton() {
  const { count } = useCart()
  return <button aria-label="Sacola de compras" className="relative transition-opacity hover:opacity-60"><ShoppingBag strokeWidth={1.5} />{count > 0 && <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-[#b94f01] text-[9px]">{count}</span>}</button>
}

export function AddToCartButton({ name }: { name: string }) {
  const { add } = useCart()
  return <button onClick={() => add(name)} className="absolute bottom-3 left-3 right-3 translate-y-3 bg-black px-4 py-3 text-xs font-medium text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">Adicionar à sacola</button>
}
