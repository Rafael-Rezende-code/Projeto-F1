'use client'

import { useActionState } from 'react'
import { subscribeNewsletter, type NewsletterState } from '@/app/actions/newsletter'
import { NEWSLETTER_CONSENT_LABEL, NEWSLETTER_PURPOSE } from '@/lib/newsletter-text'

// Formulário da newsletter ("Fique no grid"). `enabled` vem do servidor (só liga com o Supabase configurado, que é onde
// os e-mails são gravados): sem ele, campos e botão ficam desabilitados e o botão diz "Em breve". Com consentimento
// obrigatório (caixa + frase de finalidade) e um campo isca escondido contra robôs.
const initial: NewsletterState = { status: 'idle' }

export function NewsletterForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, initial)
  const off = !enabled
  const done = state.status === 'ok'
  return (
    <form action={action} className="mx-auto mt-8 max-w-md text-left" noValidate={false}>
      <div className="flex gap-2">
        <input
          aria-label="Seu endereço de e-mail"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={off || done}
          placeholder="Seu endereço de e-mail"
          className="min-w-0 flex-1 rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/50 focus-visible:border-white/70 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={off || pending || done}
          className="rounded-xl bg-[#b94f01] px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#9f4300] disabled:cursor-not-allowed disabled:bg-white/20 disabled:hover:bg-white/20"
        >
          {off ? 'Em breve' : pending ? 'Enviando…' : 'Assinar'}
        </button>
      </div>
      {/* Campo isca: invisível para pessoas e leitores de tela; robôs costumam preenchê-lo. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Não preencha este campo
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className={`mt-4 flex items-start gap-3 text-xs leading-5 ${off ? 'text-white/50' : 'text-white/80'}`}>
        <input name="consent" type="checkbox" required disabled={off || done} className="mt-0.5 size-4 shrink-0 accent-[#b94f01]" />
        <span>{NEWSLETTER_CONSENT_LABEL}</span>
      </label>
      <p className="mt-2 pl-7 text-xs leading-5 text-white/60">{NEWSLETTER_PURPOSE}</p>
      <p role="status" aria-live="polite" className={`mt-3 min-h-5 pl-7 text-xs ${state.status === 'error' ? 'text-[#ffb4a8]' : 'text-white/80'}`}>
        {off ? '' : state.message}
      </p>
    </form>
  )
}
