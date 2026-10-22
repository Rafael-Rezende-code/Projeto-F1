"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "@/app/admin/entrar/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });
  return (
    <form action={action} className="mt-6">
      <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-black/70">E-mail</label>
      <input id="email" name="email" type="email" required autoComplete="email" className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black/10" />
      <button type="submit" disabled={pending} className="mt-4 w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-[#b94f01] disabled:opacity-60">
        {pending ? "Enviando…" : "Enviar link de entrada"}
      </button>
      {state.message && (
        <p role="status" className={`mt-4 text-sm ${state.status === "error" ? "text-[#b42318]" : "text-black/70"}`}>{state.message}</p>
      )}
    </form>
  );
}
