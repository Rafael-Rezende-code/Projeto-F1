// Regras da senha do administrador (pnpm admin:senha). Sem E/S: testável.
export const PASSWORD_MIN = 10; // o mínimo que o Supabase Auth exige neste projeto (password_min_length)
export const PASSWORD_RECOMMENDED = 12;

/** Motivo para recusar a senha de vez (null = serve). */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`;
  if (password.length > 72) return "A senha pode ter no máximo 72 caracteres.";
  return null;
}

/** Aviso (a senha é aceita se o administrador confirmar). */
export const passwordWarning = (password: string): string | null =>
  password.length < PASSWORD_RECOMMENDED ? `Esta senha tem menos de ${PASSWORD_RECOMMENDED} caracteres. Prefira uma frase longa.` : null;

/** Tira a senha de qualquer texto antes de exibi-lo (mensagens de erro de bibliotecas). */
export const scrub = (text: string, ...secrets: string[]) => secrets.filter(Boolean).reduce((out, secret) => out.split(secret).join("***"), text);
