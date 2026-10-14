'use client'

// Formulário da newsletter: o único trecho da seção que precisa de evento (onSubmit); o resto é server component.
export function NewsletterForm() {
  return <form className="mx-auto mt-8 flex max-w-md gap-2" onSubmit={(event) => event.preventDefault()}><input aria-label="Seu endereço de e-mail" type="email" required placeholder="Seu endereço de e-mail" className="min-w-0 flex-1 rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/50 focus-visible:border-white/70" /><button className="rounded-xl bg-[#b94f01] px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#9f4300]">Assinar</button></form>
}
