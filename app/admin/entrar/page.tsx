import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { adminDisabled, isAdminEmail } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/session";

export default async function EntrarPage() {
  if (adminDisabled()) return null;
  const { data } = await (await createSessionClient()).auth.getUser();
  if (data.user && isAdminEmail(data.user.email)) redirect("/admin");
  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-8">
      <h1 className="text-3xl tracking-[-0.04em]">Entrar no painel</h1>
      <p className="mt-3 text-sm leading-6 text-black/60">Entre com o e-mail e a senha do administrador.</p>
      {data.user && !isAdminEmail(data.user.email) && (
        <p role="alert" className="mt-4 rounded-xl bg-[#b42318]/5 p-3 text-sm text-[#b42318]">Este e-mail não tem acesso ao painel.</p>
      )}
      <LoginForm />
    </div>
  );
}
