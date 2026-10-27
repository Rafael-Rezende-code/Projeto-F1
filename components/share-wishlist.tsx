"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { shareWishlist } from "@/app/actions/wishlist";
import { cleanListName, wishlistQuery, WISHLIST_NAME_MAX } from "@/lib/wishlist";

// "Compartilhar minha lista" em /favoritos (loja extra, item 4). Com Supabase, link curto (/desejos/<token>), e quem criou
// atualiza o MESMO link ao compartilhar de novo (token + chave de edição neste aparelho). Sem banco, o link completo
// (/desejos?l=...) já leva a lista. Web Share quando o aparelho tem, WhatsApp e copiar.
const KEY = "apex:lista:v1";
type Saved = { token: string; secret: string; name?: string };

const readSaved = (): Saved | null => {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Saved | null;
    return value && typeof value.token === "string" && typeof value.secret === "string" ? value : null;
  } catch {
    return null;
  }
};

const noop = () => () => {};

export function ShareWishlist({ products, shortLinks }: { products: { id: string; slug: string }[]; shortLinks: boolean }) {
  const id = useId();
  // Nome inicial: o da última lista compartilhada neste aparelho (lido só no navegador).
  const [name, setName] = useState(() => (typeof window === "undefined" ? "" : (readSaved()?.name ?? "")));
  const [generated, setGenerated] = useState<{ key: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);
  // O link vale para a lista e o nome em que foi gerado; mudou algo, o próximo compartilhamento gera (ou atualiza) de novo.
  const linkKey = `${products.map((item) => item.slug).join(",")}|${cleanListName(name)}`;
  const link = generated?.key === linkKey ? generated.url : "";

  const ensureLink = async () => {
    if (link) return link;
    setBusy(true);
    setMessage("");
    let url = `${window.location.origin}${wishlistQuery(products, name)}`;
    if (shortLinks) {
      const saved = readSaved();
      const result = await shareWishlist({ slugs: products.map((item) => item.slug), name: cleanListName(name), token: saved?.token, secret: saved?.secret });
      if (result.ok) {
        url = `${window.location.origin}/desejos/${result.token}`;
        try {
          window.localStorage.setItem(KEY, JSON.stringify({ token: result.token, secret: result.secret ?? saved?.secret, name: cleanListName(name) }));
        } catch {}
      } else setMessage(result.message);
    }
    setBusy(false);
    setGenerated({ key: linkKey, url });
    return url;
  };

  const text = (url: string) => `${cleanListName(name) ? `A lista de ${cleanListName(name)}` : "Minha lista de desejos"} na loja: ${url}`;
  const share = async () => {
    const url = await ensureLink();
    try {
      await navigator.share({ title: "Lista de desejos", text: text(url), url });
    } catch {}
  };
  const whatsapp = async () => {
    const url = await ensureLink();
    window.open(`https://wa.me/?text=${encodeURIComponent(text(url))}`, "_blank", "noopener,noreferrer");
  };
  const copy = async () => {
    const url = await ensureLink();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      document.getElementById(`${id}-link`)?.focus();
    }
  };

  const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/15 px-4 text-sm font-medium text-black transition hover:border-black disabled:opacity-60";
  return (
    <section aria-labelledby={`${id}-titulo`} className="mb-10 rounded-2xl bg-[#f5f5f3] p-5 text-black sm:p-6">
      <h2 id={`${id}-titulo`} className="font-ui text-lg font-medium tracking-[-0.03em]">Compartilhar minha lista</h2>
      <p className="mt-1 text-sm text-black/60">Mande para quem vai te dar um presente. Quem abrir vê as peças e pode colocar na sacola.</p>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="lg:w-64">
          <label htmlFor={`${id}-nome`} className="mb-1.5 block text-xs font-medium text-black/70">Seu nome (opcional)</label>
          <input id={`${id}-nome`} value={name} maxLength={WISHLIST_NAME_MAX} autoComplete="given-name" onChange={(event) => setName(event.target.value)} className="min-h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-base text-black outline-none focus-visible:border-black sm:text-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          {canShare && (
            <button type="button" onClick={share} disabled={busy} className={button}>
              <Share2 size={16} aria-hidden="true" /> Compartilhar
            </button>
          )}
          <button type="button" onClick={whatsapp} disabled={busy} className={button}>WhatsApp</button>
          <button type="button" onClick={copy} disabled={busy} className={`${button} bg-black text-white hover:bg-[#b94f01] hover:border-[#b94f01]`}>
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? "Link copiado" : "Copiar link"}
          </button>
        </div>
      </div>
      {link && (
        <div className="mt-3">
          <label htmlFor={`${id}-link`} className="sr-only">Link da lista</label>
          <input id={`${id}-link`} readOnly value={link} onFocus={(event) => event.currentTarget.select()} className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-mono text-xs text-black/70" data-wishlist-link />
          {shortLinks && <p className="mt-1.5 text-xs text-black/60">Compartilhar de novo atualiza este mesmo link com a sua lista atual.</p>}
        </div>
      )}
      {message && <p role="status" className="mt-2 text-xs text-black/60">{message}</p>}
    </section>
  );
}
