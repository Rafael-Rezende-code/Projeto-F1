// Último CEP digitado (calcular frete na página de produto/carrinho → checkout). localStorage com try/catch: em aba
// privada ou com armazenamento bloqueado, simplesmente não lembra. Só no navegador.
const KEY = "apex:cep:v1";

export function readSavedCep() {
  try {
    const value = window.localStorage.getItem(KEY) ?? "";
    return /^\d{8}$/.test(value) ? value : "";
  } catch {
    return "";
  }
}

export function saveCep(cep: string) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return;
  try {
    window.localStorage.setItem(KEY, digits);
  } catch {}
}
