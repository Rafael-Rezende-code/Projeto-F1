import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { adminDisabled, isAdminEmail } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/session";

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (adminDisabled()) return null;
  const { data } = await (await createSessionClient()).auth.getUser();
  if (data.user && isAdminEmail(data.user.email)) redirect("/admin");
  const { erro } = await searchParams;
  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-8">
      <h1 className="text-3xl tracking-[-0.04em]">Entrar no painel</h1>
      <p className="mt-3 text-sm leading-6 text-black/60">Enviamos um link de entrada para o seu e-mail. Sem senha.</p>
      {erro && <p role="alert" className="mt-4 rounded-xl bg-[#b42318]/5 p-3 text-sm text-[#b42318]">O link expirou ou já foi usado. Peça outro.</p>}
      {data.user && !isAdminEmail(data.user.email) && (
        <p role="alert" className="mt-4 rounded-xl bg-[#b42318]/5 p-3 text-sm text-[#b42318]">Este e-mail não tem acesso ao painel.</p>
      )}
      <LoginForm />
    </div>
  );
}
