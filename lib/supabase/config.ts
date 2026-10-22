// Supabase (fase 9): LIGADO só quando as variáveis de ambiente existem. Sem elas, o site usa o seed local e os pedidos
// continuam simulados (zero mudança). Passo a passo em docs/backend/supabase.md; nomes em .env.example.
//
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY: leitura do catálogo (RLS: só o que é público) e login do
//   painel admin (cliente com a sessão do usuário; a escrita passa pelo RLS de administrador).
// SUPABASE_SERVICE_ROLE_KEY: SÓ no servidor (ignora RLS). Cria pedidos (create_order), devolve estoque e atualiza o
//   pagamento pelo webhook. Nunca usar em código de cliente nem com prefixo NEXT_PUBLIC_.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Catálogo e painel admin pelo Supabase. */
export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey);

/** Pedidos gravados no banco (precisa também da service role, só no servidor). */
export const isOrderStoreConfigured = () => isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
