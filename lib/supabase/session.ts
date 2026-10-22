import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";

// Cliente do Supabase COM a sessão do usuário (cookies), para o painel admin (server components e server actions).
// Usa a chave anon: o que ele pode ler/gravar é decidido pelo RLS (is_admin()). Em server components o Next não deixa
// gravar cookies; a renovação da sessão acontece no proxy.ts (só em /admin).
export async function createSessionClient() {
  const store = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // chamado de um server component: ignorado (o proxy renova a sessão)
        }
      },
    },
  });
}
