"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente do Supabase no NAVEGADOR (painel admin): envio de fotos para o Storage com a sessão do administrador.
// O RLS do bucket "produtos" só aceita envio de administradores.
export const createAdminBrowserClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
