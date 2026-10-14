'use client'

// Formulário da newsletter: o único trecho da seção que precisa de evento (onSubmit); o resto é server component.
export function NewsletterForm() {
  return <form className="mx-auto mt-8 flex max-w-md border-b border-white/25 pb-3" onSubmit={(event) => event.preventDefault()}><input aria-label="Seu endereço de e-mail" type="email" required placeholder="Seu endereço de e-mail" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50" /><button className="text-xs font-semibold uppercase tracking-[0.15em] text-[#e8702a]">Assinar</button></form>
}
