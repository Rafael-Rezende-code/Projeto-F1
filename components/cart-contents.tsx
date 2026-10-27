'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '@/components/cart'
import { FREE_SHIPPING_THRESHOLD_CENTS } from '@/lib/cart/config'
import { freeShippingRemaining } from '@/lib/cart/reducer'
import { formatPrice } from '@/lib/format'
import { DispatchSummary } from '@/components/dispatch-summary'
import { ShippingEstimator } from '@/components/shipping-estimator'
import { CouponField } from '@/components/coupon-field'
import { useState } from 'react'
import { daysLabel } from '@/lib/catalog/fulfillment'
import { pixPrice, storePolicy } from '@/lib/store-policy'

// Conteúdo da sacola, usado na gaveta (variant="drawer") e na página /carrinho (variant="page").
// `empty`: conteúdo extra abaixo da sacola vazia (na página: "Mais desejados", components/most-wanted.tsx).
// `couponsEnabled`: campo de cupom (só com pedidos gravados no Supabase; a página decide no servidor).
export function CartContents({ variant, onNavigate, empty, couponsEnabled = false }: { variant: 'drawer' | 'page'; onNavigate?: () => void; empty?: ReactNode; couponsEnabled?: boolean }) {
  const { items, subtotalCents, setQuantity, removeItem, ready } = useCart()
  const [coupon, setCoupon] = useState<{ code: string; discountCents: number } | null>(null)
  const remaining = freeShippingRemaining(subtotalCents)
  // Barra de frete grátis só existe se a loja configurou o limite (NEXT_PUBLIC_FREE_SHIPPING_FROM_CENTS).
  const threshold = FREE_SHIPPING_THRESHOLD_CENTS
  const hasFreeShipping = threshold !== null
  const progress = threshold !== null ? Math.min(100, Math.round((subtotalCents / threshold) * 100)) : 0

  if (!ready) return <p className="px-1 py-10 text-sm text-black/60">Carregando a sacola…</p>

  if (items.length === 0) {
    return (
      <>
      <div className={`flex flex-col items-center text-center ${variant === 'page' ? 'rounded-2xl bg-[#f5f5f3] px-6 py-20' : 'px-2 py-16'}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Sacola vazia</p>
        <p className="mt-3 text-2xl font-medium tracking-[-0.05em]">Nada no grid por enquanto.</p>
        <p className="mt-3 max-w-xs text-sm leading-6 text-black/60">Escolha sua equipe ou seu piloto e monte o kit do próximo GP.</p>
        <Link href="/produtos" onClick={onNavigate} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b94f01]">
          Ver a coleção
        </Link>
      </div>
      {empty}
      </>
    )
  }

  return (
    <div className={variant === 'page' ? 'grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16' : 'flex min-h-0 flex-1 flex-col'}>
      <ul role="list" className={`divide-y divide-black/10 ${variant === 'drawer' ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1' : 'border-y border-black/10'}`}>
        {items.map((item) => (
          <li key={item.sku} className="flex gap-4 py-5">
            <Link href={`/produtos/${item.slug}`} onClick={onNavigate} className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-xl bg-[#e9e8e4] sm:w-24" tabIndex={-1} aria-hidden="true">
              {item.image && <Image src={item.image} alt="" fill sizes="96px" quality={75} className="object-cover" />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/produtos/${item.slug}`} onClick={onNavigate} className="text-sm font-medium hover:underline">
                    {item.name}
                  </Link>
                  <p className="mt-1 text-xs text-black/60">Tamanho: {item.size}</p>
                  {item.fulfillment === 'sob_encomenda' && item.dispatchDays && (
                    <p className="mt-0.5 text-xs text-black/60">Sob encomenda · envio em {daysLabel(item.dispatchDays)}</p>
                  )}
                </div>
                <p className="whitespace-nowrap text-sm">{formatPrice(item.priceCents * item.quantity)}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center rounded-xl border border-black/15" role="group" aria-label={`Quantidade de ${item.name}`}>
                  <button type="button" onClick={() => setQuantity(item.sku, item.quantity - 1)} aria-label="Diminuir quantidade" className="flex size-9 items-center justify-center rounded-l-xl transition hover:bg-black/5">
                    <Minus size={14} />
                  </button>
                  <span className="w-7 text-center text-sm tabular-nums" aria-live="polite">{item.quantity}</span>
                  <button type="button" onClick={() => setQuantity(item.sku, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Aumentar quantidade" className="flex size-9 items-center justify-center rounded-r-xl transition hover:bg-black/5 disabled:opacity-30">
                    <Plus size={14} />
                  </button>
                </div>
                {item.quantity >= item.stock && <span className="text-[11px] text-black/60">Máximo em estoque</span>}
                <button type="button" onClick={() => removeItem(item.sku)} aria-label={`Remover ${item.name} (${item.size})`} className="rounded-xl p-2 text-black/60 transition hover:bg-black/5 hover:text-black">
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className={variant === 'page' ? 'h-fit rounded-2xl bg-[#f5f5f3] p-6 lg:sticky lg:top-24' : 'border-t border-black/10 pt-5'}>
        {hasFreeShipping && (
        <div className="rounded-xl bg-white p-4 text-xs leading-5 text-black/70 ring-1 ring-black/5">
          {remaining > 0 ? (
            <p>
              Faltam <strong className="font-semibold text-black">{formatPrice(remaining)}</strong> para o frete grátis.
            </p>
          ) : (
            <p className="font-medium text-black">Você ganhou frete grátis.</p>
          )}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-label="Progresso até o frete grátis" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full rounded-full bg-[#b94f01] transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        )}
        {variant === 'page' && couponsEnabled && <CouponField items={items.map((item) => ({ sku: item.sku, quantity: item.quantity }))} onApplied={(applied) => setCoupon(applied)} className="mt-5" />}
        <dl className="mt-5 flex flex-col gap-1 text-sm">
          {coupon && coupon.discountCents > 0 && (
            <div className="flex items-center justify-between text-black/70"><dt>Cupom {coupon.code}</dt><dd>−{formatPrice(coupon.discountCents)}</dd></div>
          )}
          <div className="flex items-center justify-between">
            <dt>Subtotal</dt>
            <dd className="text-lg font-medium tracking-[-0.03em]">{formatPrice(subtotalCents - (coupon?.discountCents ?? 0))}</dd>
          </div>
        </dl>
        {storePolicy.pixDiscountPercent > 0 && (
          <p className="mt-1 text-right text-sm text-black" data-pix-price>
            <span className="font-medium">{formatPrice(pixPrice(subtotalCents - (coupon?.discountCents ?? 0)) ?? 0)}</span> no Pix <span className="text-black/60">({storePolicy.pixDiscountPercent}% off)</span>
          </p>
        )}
        <p className="mt-1 text-xs text-black/60">Frete calculado no checkout.</p>
        <DispatchSummary items={items} className="mt-3" />
        {variant === 'page' && <ShippingEstimator items={items.map((item) => ({ sku: item.sku, quantity: item.quantity }))} className="mt-5 border-t border-black/10 pt-5" />}
        <Link href="/checkout" onClick={onNavigate} className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#b94f01] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-[#9f4300]">
          Finalizar compra
        </Link>
        {variant === 'drawer' && (
          <Link href="/carrinho" onClick={onNavigate} className="mt-3 flex w-full items-center justify-center rounded-xl border border-black/15 px-6 py-3 text-sm font-medium transition hover:border-black">
            Ver sacola completa
          </Link>
        )}
      </div>
    </div>
  )
}
