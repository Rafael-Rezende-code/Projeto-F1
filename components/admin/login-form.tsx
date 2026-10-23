"use client";

import { useActionState } from "react";
import { loginWithPassword, type LoginState } from "@/app/admin/entrar/actions";

const field = "w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black/10";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginWithPassword, { status: "idle" });
  return (
    <form action={action} className="mt-6">
      <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-black/70">E-mail</label>
      <input id="email" name="email" type="email" required autoComplete="username" className={field} />
      <label htmlFor="password" className="mb-1.5 mt-4 block text-xs font-medium text-black/70">Senha</label>
      <input id="password" name="password" type="password" required autoComplete="current-password" maxLength={200} className={field} />
      <button type="submit" disabled={pending} className="mt-5 w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-[#b94f01] disabled:opacity-60">
        {pending ? "Entrando…" : "Entrar"}
      </button>
      {state.message && (
        <p role="alert" className="mt-4 rounded-xl bg-[#b42318]/5 p-3 text-sm text-[#b42318]">{state.message}</p>
      )}
    </form>
  );
}
