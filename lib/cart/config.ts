import { storePolicy } from "@/lib/store-policy";

// Configuração da sacola. Valores em centavos.
/** Frete grátis a partir deste subtotal (centavos), de NEXT_PUBLIC_FREE_SHIPPING_FROM_CENTS (lib/store-policy.ts). null = não há frete grátis. */
export const FREE_SHIPPING_THRESHOLD_CENTS: number | null = storePolicy.freeShippingFromCents;
/** Chave do localStorage (versionada: mudar o formato do item exige trocar a versão). */
export const CART_STORAGE_KEY = "apex:sacola:v1";
