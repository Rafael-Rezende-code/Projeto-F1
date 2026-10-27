// "Salvar meus dados neste aparelho" (loja extra, item 1c): contato e endereço no localStorage, com try/catch (aba
// privada ou armazenamento bloqueado: simplesmente não lembra). NUNCA guarda CPF, pagamento nem aceite dos termos: só os
// campos listados em SAVED_FIELDS passam por `sanitizeSaved`.
const KEY = "apex:checkout:dados:v1";

export const SAVED_FIELDS = ["name", "email", "phone", "cep", "street", "number", "complement", "district", "city", "state"] as const;
export type SavedData = Partial<Record<(typeof SAVED_FIELDS)[number], string>>;

/** Só os campos permitidos, como texto curto. Qualquer outra chave (cpf, method...) é descartada. */
export function sanitizeSaved(value: unknown): SavedData | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const clean: SavedData = {};
  for (const field of SAVED_FIELDS) {
    const item = source[field];
    if (typeof item === "string" && item.trim() && item.length <= 160) clean[field] = item;
  }
  return Object.keys(clean).length ? clean : null;
}

export function readSavedData(): SavedData | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? sanitizeSaved(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeSavedData(data: Record<string, unknown>) {
  const clean = sanitizeSaved(data);
  try {
    if (clean) window.localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {}
}

export function clearSavedData() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
