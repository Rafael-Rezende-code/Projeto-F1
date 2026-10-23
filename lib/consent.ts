// Consentimento de cookies (operação, fase 4). Só existe banner se houver alguma ferramenta configurada
// (NEXT_PUBLIC_GA_ID ou NEXT_PUBLIC_META_PIXEL_ID). Categorias: necessários (sempre; sacola, favoritos, este registro),
// medição (Google Analytics 4) e marketing (Meta Pixel). Guardado no localStorage com versão e data; mudar a versão
// pede o consentimento de novo. Testes em consent.test.ts.
export const CONSENT_KEY = "apex:consentimento:v1";
export const CONSENT_VERSION = 1;
export const CONSENT_REOPEN_EVENT = "apex:consentimento:abrir";
const CHANGE_EVENT = "apex:consentimento:mudou";

export type ConsentChoices = { analytics: boolean; marketing: boolean };
export type StoredConsent = ConsentChoices & { version: number; date: string };

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
/** Alguma ferramenta configurada? Sem nenhuma, não há banner, script nem evento. */
export const trackingConfigured = (ga = GA_ID, pixel = META_PIXEL_ID) => Boolean(ga || pixel);

export function parseConsent(raw: string | null | undefined): StoredConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredConsent>;
    if (value.version !== CONSENT_VERSION || typeof value.analytics !== "boolean" || typeof value.marketing !== "boolean") return null;
    return { version: CONSENT_VERSION, analytics: value.analytics, marketing: value.marketing, date: String(value.date ?? "") };
  } catch {
    return null;
  }
}

// Leitura com cache por texto (useSyncExternalStore exige o mesmo objeto enquanto nada muda).
let cachedRaw: string | null | undefined;
let cachedValue: StoredConsent | null = null;
export function readConsent(): StoredConsent | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CONSENT_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseConsent(raw);
  }
  return cachedValue;
}

export function saveConsent(choices: ConsentChoices) {
  const value: StoredConsent = { version: CONSENT_VERSION, ...choices, date: new Date().toISOString() };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  } catch {
    // sem armazenamento: vale só nesta página
    cachedRaw = JSON.stringify(value);
    cachedValue = value;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeConsent(callback: () => void) {
  const onStorage = (event: StorageEvent) => event.key === CONSENT_KEY && callback();
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export const openConsentPreferences = () => window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT));
