"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  CONSENT_REOPEN_EVENT,
  GA_ID,
  META_PIXEL_ID,
  openConsentPreferences,
  readConsent,
  saveConsent,
  subscribeConsent,
  trackingConfigured,
  type ConsentChoices,
} from "@/lib/consent";

// Consentimento + scripts de medição (operação, fase 4). Montado no layout raiz SÓ quando há GA4 ou Meta Pixel
// configurado. Os scripts entram depois do "sim" de cada categoria (nada carrega antes). O banner é fixo sobre a página
// (não empurra o conteúdo: sem mudança de layout), com "Recusar", "Aceitar todos" e "Personalizar" do mesmo peso, e
// volta pelo link "Preferências de cookies" do rodapé. Fora do /admin.
const noop = () => () => {};
const BUTTON = "min-h-11 whitespace-nowrap rounded-xl border border-black bg-white px-4 text-sm font-medium text-black transition hover:bg-black hover:text-white";

type Gtag = (...args: unknown[]) => void;
type Fbq = (...args: unknown[]) => void;

export function ConsentManager() {
  const pathname = usePathname();
  // undefined = ainda não montou (servidor/hidratação); null = sem decisão
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => undefined);
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(CONSENT_REOPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, open);
  }, []);

  // Revogou depois de carregar: avisa as ferramentas (o script já baixado só sai de vez ao recarregar a página).
  useEffect(() => {
    if (!consent) return;
    const w = window as unknown as { gtag?: Gtag; fbq?: Fbq };
    if (!consent.analytics) w.gtag?.("consent", "update", { analytics_storage: "denied" });
    if (!consent.marketing) w.fbq?.("consent", "revoke");
  }, [consent]);

  // PageView do Pixel nas navegações internas (o GA4 mede sozinho pelo histórico do navegador).
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    if (consent?.marketing) (window as unknown as { fbq?: Fbq }).fbq?.("track", "PageView");
  }, [pathname, consent?.marketing]);

  if (!mounted || pathname.startsWith("/admin")) return null;
  const choose = (choices: ConsentChoices) => {
    saveConsent(choices);
    setReopened(false);
  };
  return (
    <>
      {GA_ID && consent?.analytics && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('js',new Date());gtag('config',${JSON.stringify(GA_ID)});`}
          </Script>
        </>
      )}
      {META_PIXEL_ID && consent?.marketing && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('consent','grant');fbq('init',${JSON.stringify(META_PIXEL_ID)});fbq('track','PageView');`}
        </Script>
      )}
      {(consent === null || reopened) && <ConsentBanner initial={consent ?? null} onChoose={choose} onClose={consent ? () => setReopened(false) : undefined} />}
    </>
  );
}

function ConsentBanner({ initial, onChoose, onClose }: { initial: ConsentChoices | null; onChoose: (choices: ConsentChoices) => void; onClose?: () => void }) {
  const [custom, setCustom] = useState(Boolean(initial));
  const [analytics, setAnalytics] = useState(initial?.analytics ?? false);
  const [marketing, setMarketing] = useState(initial?.marketing ?? false);
  const tools = [GA_ID && "medição (Google Analytics)", META_PIXEL_ID && "marketing (Meta Pixel)"].filter(Boolean).join(" e ");
  return (
    <section
      role="region"
      aria-label="Preferências de cookies"
      className="consent-banner fixed inset-x-4 z-[70] max-h-[calc(100svh-var(--dock-space)-24px)] overflow-y-auto rounded-2xl border border-black/10 bg-white p-5 text-black shadow-[0_12px_40px_rgba(0,0,0,0.18)] sm:right-auto sm:w-[420px]"
    >
      <h2 className="font-ui text-base font-medium">Cookies</h2>
      <p className="mt-2 text-sm leading-6 text-black/70">
        Usamos cookies necessários para a sacola e os favoritos funcionarem. Com a sua permissão, também usamos {tools}.{" "}
        <Link href="/politica-de-privacidade" className="font-medium text-black underline underline-offset-4">Política de Privacidade</Link>
      </p>
      {custom && (
        <fieldset className="mt-4 space-y-3 text-sm">
          <legend className="sr-only">Categorias</legend>
          <label className="flex items-start gap-3 opacity-70">
            <input type="checkbox" checked disabled className="mt-1 size-4" />
            <span><span className="font-medium">Necessários</span><span className="block text-xs text-black/70">Sacola, favoritos e esta escolha. Sempre ligados.</span></span>
          </label>
          {GA_ID && (
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} className="mt-1 size-4 accent-black" />
              <span><span className="font-medium">Medição</span><span className="block text-xs text-black/70">Google Analytics: visitas e uso do site, para melhorar a loja.</span></span>
            </label>
          )}
          {META_PIXEL_ID && (
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} className="mt-1 size-4 accent-black" />
              <span><span className="font-medium">Marketing</span><span className="block text-xs text-black/70">Meta Pixel: anúncios mais relevantes no Instagram e no Facebook.</span></span>
            </label>
          )}
        </fieldset>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className={BUTTON} onClick={() => onChoose({ analytics: false, marketing: false })}>Recusar</button>
        <button type="button" className={BUTTON} onClick={() => onChoose({ analytics: Boolean(GA_ID), marketing: Boolean(META_PIXEL_ID) })}>Aceitar todos</button>
        {custom ? (
          <button type="button" className={`${BUTTON} col-span-2`} onClick={() => onChoose({ analytics: analytics && Boolean(GA_ID), marketing: marketing && Boolean(META_PIXEL_ID) })}>Salvar escolha</button>
        ) : (
          <button type="button" className={`${BUTTON} col-span-2`} onClick={() => setCustom(true)}>Personalizar</button>
        )}
      </div>
      {onClose && <button type="button" onClick={onClose} className="mt-3 text-xs text-black/70 underline underline-offset-4">Fechar sem mudar</button>}
    </section>
  );
}

/** Link do rodapé que reabre as preferências. Sem ferramenta configurada, não aparece. */
export function ConsentPreferencesButton({ className = "" }: { className?: string }) {
  if (!trackingConfigured()) return null;
  return (
    <button type="button" onClick={openConsentPreferences} className={className}>
      Preferências de cookies
    </button>
  );
}
