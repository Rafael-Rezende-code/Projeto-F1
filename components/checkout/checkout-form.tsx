"use client";

import { DispatchSummary } from "@/components/dispatch-summary";
import { CouponField } from "@/components/coupon-field";
import { daysLabel } from "@/lib/catalog/fulfillment";
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useCart } from "@/components/cart";
import { DecorativeCard } from "@/components/checkout/decorative-card";
import { placeOrder, quoteShipping } from "@/app/(loja)/checkout/actions";
import { ORDER_STORAGE_PREFIX, orderUrl, PAYMENT_LABELS } from "@/lib/checkout/order";
import { addressSchema, contactSchema, CPF_REQUIRED_METHODS, fieldErrors, paymentSchema, shippingSchema } from "@/lib/checkout/schema";
import type { DeliveryOption } from "@/lib/checkout/shipping";
import { readSavedCep, saveCep } from "@/lib/cep-storage";
import { clearSavedData, readSavedData, writeSavedData } from "@/lib/checkout/saved-data";
import { formatPrice } from "@/lib/format";
import { track } from "@/lib/analytics";
import { methodFromBrick } from "@/lib/payments/brick";
import { pixDiscountFor } from "@/lib/pricing";
import { storePolicy } from "@/lib/store-policy";
import type { CardDisplay } from "@/lib/payments/types";
import type { BrickSubmit } from "@/components/checkout/mercado-pago-brick";
import { maskCep, maskCpf, maskPhone, onlyDigits, UFS } from "@/lib/validators/br";

// Checkout em uma página (loja extra, item 1b): as quatro seções ficam abertas e podem ser recolhidas; a validação é a
// mesma de antes (schemas de lib/checkout/schema.ts, por seção no cliente e do pedido inteiro no servidor).
type Section = 0 | 1 | 2 | 3;
const SECTIONS = [
  { id: "contato", title: "Contato" },
  { id: "entrega", title: "Entrega" },
  { id: "envio", title: "Envio" },
  { id: "pagamento", title: "Pagamento" },
] as const;
const SCHEMAS = [contactSchema, addressSchema, shippingSchema, paymentSchema] as const;

type Form = {
  name: string; email: string; phone: string; cpf: string;
  cep: string; street: string; number: string; complement: string; district: string; city: string; state: string;
  shippingId: string; method: string; acceptTerms: boolean;
};
const EMPTY: Form = { name: "", email: "", phone: "", cpf: "", cep: "", street: "", number: "", complement: "", district: "", city: "", state: "", shippingId: "", method: "pix", acceptTerms: false };
const FIELD_SECTION: Record<string, Section> = { name: 0, email: 0, phone: 0, cep: 1, street: 1, number: 1, complement: 1, district: 1, city: 1, state: 1, shippingId: 2, method: 3, cpf: 3, acceptTerms: 3 };

const inputClass = (invalid: boolean) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-base text-black outline-none transition placeholder:text-black/35 focus-visible:border-black sm:text-sm ${invalid ? "border-[#b42318]" : "border-black/15 hover:border-black/40"}`;

function Field({ label, error, children, hint, className = "" }: { label: string; error?: string; hint?: string; children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode; className?: string }) {
  const id = useId();
  const describedBy = [error ? `${id}-erro` : null, hint ? `${id}-dica` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-black/70">{label}</label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {hint && !error && <p id={`${id}-dica`} className="mt-1.5 text-xs text-black/60">{hint}</p>}
      {error && <p id={`${id}-erro`} className="mt-1.5 text-xs text-[#b42318]">{error}</p>}
    </div>
  );
}

// Payment Brick do Mercado Pago: só é baixado quando o Mercado Pago está configurado (mpPublicKey).
const MercadoPagoBrick = dynamic(() => import("@/components/checkout/mercado-pago-brick"), {
  ssr: false,
  loading: () => <p className="py-10 text-center text-sm text-black/60">Carregando o pagamento seguro do Mercado Pago…</p>,
});

/** `mpPublicKey`: Mercado Pago ligado (vem do servidor só quando o access token também existe). */
export function CheckoutForm({ mpPublicKey, couponsEnabled = false }: { mpPublicKey?: string; couponsEnabled?: boolean }) {
  const router = useRouter();
  const { items, subtotalCents, ready, clear } = useCart();
  // begin_checkout: uma vez, quando a sacola (do localStorage) já foi lida e não está vazia.
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (!ready || checkoutTracked.current || !items.length) return;
    checkoutTracked.current = true;
    track({ name: "begin_checkout", valueCents: subtotalCents, items: items.map((item) => ({ id: item.slug, name: item.name, priceCents: item.priceCents, quantity: item.quantity, variant: item.size })) });
  }, [ready, items, subtotalCents]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [open, setOpen] = useState<boolean[]>([true, true, true, true]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const needsCpf = (CPF_REQUIRED_METHODS as readonly string[]).includes(form.method);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cepStatus, setCepStatus] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [pending, startTransition] = useTransition();
  const [cardDisplay, setCardDisplay] = useState<CardDisplay>({});
  // Cupom (prévia do servidor; o desconto que vale é o do banco, ao confirmar)
  const [coupon, setCoupon] = useState<{ code: string; discountCents: number; shippingDiscountCents: number } | null>(null);
  // "Salvar meus dados neste aparelho" (item 1c): nunca o CPF (lib/checkout/saved-data.ts).
  const [remember, setRemember] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const cepRequest = useRef<AbortController | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: "" } : current));
  };

  const values = (section: Section, source: Form = form) =>
    [
      { name: source.name, email: source.email, phone: source.phone },
      { cep: source.cep, street: source.street, number: source.number, complement: source.complement || undefined, district: source.district, city: source.city, state: source.state },
      { shippingId: source.shippingId },
      { method: source.method, cpf: (CPF_REQUIRED_METHODS as readonly string[]).includes(source.method) ? source.cpf : undefined, acceptTerms: source.acceptTerms },
    ][section];
  const sectionErrors = (section: Section) => {
    const result = SCHEMAS[section].safeParse(values(section));
    return result.success ? {} : fieldErrors(result.error);
  };
  const done = ([0, 1, 2, 3] as Section[]).map((section) => SCHEMAS[section].safeParse(values(section)).success);
  const doneCount = done.filter(Boolean).length;
  const readyToPay = done[0] && done[1] && done[2];

  /** Validação no campo, ao sair dele (só quando já há algo digitado: o campo vazio é cobrado ao finalizar). */
  const checkField = (field: keyof Form) => {
    const value = form[field];
    if (typeof value === "string" && !value.trim() && !errors[field]) return;
    const message = sectionErrors(FIELD_SECTION[field])[field] ?? "";
    setErrors((current) => (current[field] === message ? current : { ...current, [field]: message }));
  };

  // Frete (refino 2, item 7): cotado no servidor assim que o CEP tem 8 dígitos (e de novo se a sacola mudar).
  const [quotes, setQuotes] = useState<DeliveryOption[] | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const quotedFor = useRef("");
  const option = quotes?.find((item) => item.id === form.shippingId);
  const shippingCents = option?.priceCents ?? 0;
  const discountCents = coupon?.discountCents ?? 0;
  const shippingDiscountCents = Math.min(coupon?.shippingDiscountCents ?? 0, shippingCents);
  // Desconto no Pix (prévia; o servidor recalcula). Com o Brick o meio é escolhido nele: mostramos o total no Pix à parte.
  const pixPercent = storePolicy.pixDiscountPercent;
  const pixCents = pixDiscountFor(subtotalCents - discountCents, pixPercent);
  const pixApplied = !mpPublicKey && form.method === "pix" ? pixCents : 0;
  const totalCents = subtotalCents - discountCents - pixApplied + shippingCents - shippingDiscountCents;

  const cepDigits = onlyDigits(form.cep);
  const itemsKey = items.map((item) => `${item.sku}:${item.quantity}`).join(",");
  useEffect(() => {
    if (cepDigits.length !== 8 || !itemsKey) return;
    const key = `${cepDigits}|${itemsKey}`;
    if (quotedFor.current === key) return;
    quotedFor.current = key;
    let stale = false;
    setQuoting(true);
    setQuoteError("");
    quoteShipping({ cep: cepDigits, items: itemsKey.split(",").map((entry) => ({ sku: entry.slice(0, entry.lastIndexOf(":")), quantity: Number(entry.slice(entry.lastIndexOf(":") + 1)) })) })
      .then((result) => {
        if (stale) return;
        if (!result.ok) {
          setQuotes(null);
          setQuoteError(result.message);
          quotedFor.current = "";
          return;
        }
        saveCep(cepDigits);
        setQuotes(result.options);
        // mantém a escolha se ela ainda existe; senão, a mais barata
        setForm((current) => ({
          ...current,
          shippingId: result.options.some((item) => item.id === current.shippingId) ? current.shippingId : ([...result.options].sort((a, b) => a.priceCents - b.priceCents)[0]?.id ?? ""),
        }));
        setErrors((current) => (current.shippingId ? { ...current, shippingId: "" } : current));
      })
      .catch(() => {
        if (stale) return;
        setQuoteError("Não foi possível calcular o frete agora. Tente de novo em instantes.");
        quotedFor.current = "";
      })
      .finally(() => {
        if (!stale) setQuoting(false);
      });
    return () => {
      stale = true;
    };
  }, [cepDigits, itemsKey]);

  // Busca de endereço pelo ViaCEP (no cliente). Falha ou CEP inexistente: preenchimento manual, campos sempre editáveis.
  const lookupCep = async (cep: string) => {
    cepRequest.current?.abort();
    const controller = new AbortController();
    cepRequest.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 6000);
    setCepStatus({ tone: "info", text: "Buscando endereço…" });
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { erro?: boolean | string; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (data.erro) {
        setCepStatus({ tone: "error", text: "CEP não encontrado. Confira o número ou preencha o endereço manualmente." });
        return;
      }
      setForm((current) => ({
        ...current,
        street: data.logradouro || current.street,
        district: data.bairro || current.district,
        city: data.localidade || current.city,
        state: data.uf || current.state,
      }));
      setErrors((current) => ({ ...current, street: "", district: "", city: "", state: "" }));
      setCepStatus({ tone: "info", text: "Endereço encontrado. Confira e informe o número." });
    } catch (error) {
      if (controller.signal.aborted && cepRequest.current !== controller) return; // substituída por outra busca
      setCepStatus({ tone: "error", text: "Não foi possível buscar o CEP agora. Preencha o endereço manualmente." });
      void error;
    } finally {
      window.clearTimeout(timer);
    }
  };

  // Ao abrir: dados salvos neste aparelho (se houver) ou o CEP do "Calcular frete" (produto/carrinho).
  const prefilled = useRef(false);
  useEffect(() => {
    if (!ready || prefilled.current) return;
    prefilled.current = true;
    const saved = readSavedData();
    if (saved) {
      setForm((current) => ({ ...current, ...saved, cep: saved.cep ? maskCep(saved.cep) : current.cep }));
      setRemember(true);
      setHasSaved(true);
      return;
    }
    const cep = readSavedCep();
    if (cep) {
      setForm((current) => ({ ...current, cep: maskCep(cep) }));
      void lookupCep(cep);
    }
  }, [ready]);

  const forgetData = () => {
    clearSavedData();
    setHasSaved(false);
    setRemember(false);
    setForm((current) => ({ ...EMPTY, method: current.method, acceptTerms: current.acceptTerms }));
    setQuotes(null);
    quotedFor.current = "";
    setCepStatus(null);
  };

  /** Valida as seções pedidas; abre as que têm erro e leva o foco ao primeiro campo inválido. */
  const validateSections = (sections: Section[]) => {
    const found: Record<string, string> = {};
    for (const section of sections) Object.assign(found, sectionErrors(section));
    const keys = Object.keys(found);
    if (!keys.length) return true;
    setErrors((current) => ({ ...current, ...found }));
    const failing = new Set(keys.map((key) => FIELD_SECTION[key]).filter((value) => value !== undefined));
    setOpen((current) => current.map((value, index) => value || failing.has(index as Section)));
    window.requestAnimationFrame(() => {
      const first = document.querySelector<HTMLElement>("[data-checkout] [aria-invalid=true]");
      if (first) first.focus();
      else if (failing.has(2)) document.getElementById("secao-envio")?.scrollIntoView({ block: "center" });
    });
    return false;
  };

  const orderInput = (payment: Record<string, unknown>) => ({
    contact: { name: form.name, email: form.email, phone: form.phone },
    address: { cep: form.cep, street: form.street, number: form.number, complement: form.complement || undefined, district: form.district, city: form.city, state: form.state },
    shipping: { shippingId: form.shippingId },
    coupon: coupon?.code,
    payment: { acceptTerms: form.acceptTerms, ...payment },
    items: items.map((item) => ({ sku: item.sku, quantity: item.quantity })),
  });

  /** Depois do placeOrder: erro → mensagem (false); ok → guarda, esvazia a sacola e vai para a página do pedido. */
  const finish = (result: Awaited<ReturnType<typeof placeOrder>>) => {
    if (!result.ok) {
      setSubmitError(result.message);
      if (result.errors) setErrors(Object.fromEntries(Object.entries(result.errors).map(([key, value]) => [key.split(".").pop() as string, value])));
      return false;
    }
    try {
      window.sessionStorage.setItem(ORDER_STORAGE_PREFIX + result.order.id, JSON.stringify(result.order));
    } catch {
      // sem sessionStorage: a página do pedido mostra só o número
    }
    if (remember) writeSavedData(form);
    else clearSavedData();
    // Recusado: a sacola fica (o cliente tenta de novo); nos outros casos o pedido foi feito.
    if (result.order.status !== "recusado") {
      track({
        name: "purchase",
        transactionId: result.order.id,
        valueCents: result.order.totalCents,
        shippingCents: result.order.shipping.priceCents,
        items: result.order.lines.map((line) => ({ id: line.slug, name: line.name, priceCents: line.unitPriceCents, quantity: line.quantity, variant: line.size })),
      });
      clear();
    }
    router.push(orderUrl(result.order));
    return true;
  };

  const submit = () => {
    setSubmitError("");
    if (!validateSections([0, 1, 2, 3])) return;
    startTransition(async () => {
      finish(await placeOrder(orderInput({ method: form.method, cpf: needsCpf ? form.cpf : undefined })));
    });
  };

  // Mercado Pago: o Brick chama isto no envio. Rejeitar mantém o Brick editável (aceite pendente, recusa, erro).
  const submitBrick = async ({ selectedPaymentMethod, formData }: BrickSubmit) => {
    setSubmitError("");
    if (!validateSections([0, 1, 2])) throw new Error("dados pendentes");
    if (!form.acceptTerms) {
      setErrors((current) => ({ ...current, acceptTerms: "É preciso aceitar os Termos de Uso e a Política de Privacidade." }));
      throw new Error("aceite pendente");
    }
    const method = methodFromBrick(selectedPaymentMethod);
    if (!method) {
      setSubmitError("Escolha Pix, cartão de crédito ou boleto.");
      throw new Error("meio não aceito");
    }
    const result = await placeOrder(orderInput({ method, providerData: formData }));
    // Cartão recusado na hora: fica no checkout, com o motivo, para tentar outro cartão ou meio.
    if (result.ok && result.order.status === "recusado") {
      setSubmitError(result.order.payment.instructions ?? "O pagamento não foi aprovado. Tente outro cartão ou outra forma de pagamento.");
      throw new Error("recusado");
    }
    if (!finish(result)) throw new Error("erro no pedido");
  };

  if (!ready) return <p className="py-16 text-sm text-black/60">Carregando a sacola…</p>;
  if (items.length === 0)
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-[#f5f5f3] px-6 py-16 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Sacola vazia</p>
        <h2 className="mt-3 text-2xl font-medium tracking-[-0.05em]">Não há o que finalizar.</h2>
        <Link href="/produtos" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b94f01]">Ver a coleção</Link>
      </div>
    );

  const recap = [
    [form.name, form.email, form.phone].filter(Boolean).join(" · "),
    form.street ? `${form.street}, ${form.number}${form.complement ? ` – ${form.complement}` : ""} · ${form.city}/${form.state} · ${form.cep}` : "",
    option ? `${option.label} · ${option.days} · ${shippingCents === 0 ? "Grátis" : formatPrice(shippingCents)}` : "",
    PAYMENT_LABELS[form.method as keyof typeof PAYMENT_LABELS] ?? "",
  ];

  const section = (index: Section, children: ReactNode) => {
    const { id, title } = SECTIONS[index];
    const isOpen = open[index];
    return (
      <section id={`secao-${id}`} aria-labelledby={`titulo-${id}`} className="scroll-mt-24 rounded-2xl border border-black/10 p-5 sm:p-7">
        <h2 id={`titulo-${id}`} className="font-ui text-lg font-medium tracking-[-0.03em]">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={`conteudo-${id}`}
            onClick={() => setOpen((current) => current.map((value, i) => (i === index ? !value : value)))}
            className="flex w-full items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            <span aria-hidden="true" className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs transition-colors duration-[var(--motion-short)] ${done[index] ? "bg-black text-white" : "bg-black/10 text-black/60"}`}>
              {done[index] ? <Check size={14} /> : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              {title}
              {done[index] && <span className="sr-only"> (pronto)</span>}
              {!isOpen && recap[index] && <span className="mt-0.5 block truncate text-xs font-normal tracking-normal text-black/60">{recap[index]}</span>}
            </span>
            <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-black/50 transition-transform duration-[var(--motion-short)] ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </h2>
        <div id={`conteudo-${id}`} hidden={!isOpen}>
          {children}
        </div>
      </section>
    );
  };

  const confirmLabel = pending ? "Confirmando pedido…" : `Confirmar pedido · ${formatPrice(totalCents)}`;

  return (
    <div data-checkout className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:pb-0">
      <div className="flex flex-col gap-4">
        {/* Progresso discreto */}
        <div className="flex items-center gap-3" aria-live="polite">
          <div aria-hidden="true" className="flex flex-1 gap-1.5">
            {done.map((value, index) => (
              <span key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-black/10">
                <span className={`block h-full origin-left rounded-full bg-[#b94f01] transition-transform duration-[var(--motion-medium)] ease-[var(--ease-out)] ${value ? "scale-x-100" : "scale-x-0"}`} />
              </span>
            ))}
          </div>
          <p className="shrink-0 text-xs text-black/60">{doneCount} de 4 prontas</p>
        </div>

        {section(
          0,
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" error={errors.name} className="sm:col-span-2">
              {(p) => <input {...p} autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={() => checkField("name")} className={inputClass(!!errors.name)} />}
            </Field>
            <Field label="E-mail" error={errors.email}>
              {(p) => <input {...p} type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} enterKeyHint="next" value={form.email} onChange={(e) => set("email", e.target.value)} onBlur={() => checkField("email")} className={inputClass(!!errors.email)} />}
            </Field>
            <Field label="Telefone" error={errors.phone}>
              {(p) => <input {...p} type="tel" autoComplete="tel-national" inputMode="tel" enterKeyHint="next" placeholder="(11) 91234-5678" value={form.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} onBlur={() => checkField("phone")} className={inputClass(!!errors.phone)} />}
            </Field>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 shrink-0 accent-[#b94f01]" />
                Salvar meus dados neste aparelho
              </label>
              {hasSaved && (
                <button type="button" onClick={forgetData} className="min-h-11 text-xs text-black/60 underline underline-offset-4 hover:text-black">
                  Limpar meus dados
                </button>
              )}
              <p className="w-full text-xs text-black/60">Guardamos contato e endereço só neste navegador, para a próxima compra. O CPF nunca é salvo.</p>
            </div>
          </div>,
        )}

        {section(
          1,
          <div className="mt-6 grid gap-4 sm:grid-cols-6">
            <Field label="CEP" error={errors.cep} className="sm:col-span-2">
              {(p) => (
                <input
                  {...p}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  enterKeyHint="next"
                  placeholder="00000-000"
                  value={form.cep}
                  onChange={(e) => {
                    const masked = maskCep(e.target.value);
                    set("cep", masked);
                    const digits = onlyDigits(masked);
                    if (digits.length === 8) void lookupCep(digits);
                    else setCepStatus(null);
                  }}
                  onBlur={() => checkField("cep")}
                  className={inputClass(!!errors.cep)}
                />
              )}
            </Field>
            <p aria-live="polite" className={`self-end text-xs sm:col-span-4 sm:pb-3 ${cepStatus?.tone === "error" ? "text-[#b42318]" : "text-black/60"}`}>
              {cepStatus?.text}
            </p>
            <Field label="Rua" error={errors.street} className="sm:col-span-4">
              {(p) => <input {...p} autoComplete="address-line1" enterKeyHint="next" value={form.street} onChange={(e) => set("street", e.target.value)} onBlur={() => checkField("street")} className={inputClass(!!errors.street)} />}
            </Field>
            <Field label="Número" error={errors.number} className="sm:col-span-2">
              {(p) => <input {...p} inputMode="text" enterKeyHint="next" value={form.number} onChange={(e) => set("number", e.target.value)} onBlur={() => checkField("number")} className={inputClass(!!errors.number)} />}
            </Field>
            <Field label="Complemento (opcional)" error={errors.complement} className="sm:col-span-3">
              {(p) => <input {...p} autoComplete="address-line2" enterKeyHint="next" value={form.complement} onChange={(e) => set("complement", e.target.value)} onBlur={() => checkField("complement")} className={inputClass(!!errors.complement)} />}
            </Field>
            <Field label="Bairro" error={errors.district} className="sm:col-span-3">
              {(p) => <input {...p} autoComplete="address-level3" enterKeyHint="next" value={form.district} onChange={(e) => set("district", e.target.value)} onBlur={() => checkField("district")} className={inputClass(!!errors.district)} />}
            </Field>
            <Field label="Cidade" error={errors.city} className="sm:col-span-4">
              {(p) => <input {...p} autoComplete="address-level2" enterKeyHint="next" value={form.city} onChange={(e) => set("city", e.target.value)} onBlur={() => checkField("city")} className={inputClass(!!errors.city)} />}
            </Field>
            <Field label="Estado" error={errors.state} className="sm:col-span-2">
              {(p) => (
                <select {...p} autoComplete="address-level1" value={form.state} onChange={(e) => set("state", e.target.value)} onBlur={() => checkField("state")} className={inputClass(!!errors.state)}>
                  <option value="">UF</option>
                  {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              )}
            </Field>
          </div>,
        )}

        {section(
          2,
          <fieldset className="mt-6">
            <legend className="sr-only">Forma de envio</legend>
            {quoting ? (
              <p className="flex items-center gap-2 text-sm text-black/60"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Calculando o frete…</p>
            ) : quotes?.length ? (
              <div className="flex flex-col gap-3">
                {quotes.map((item) => {
                  const price = item.priceCents;
                  return (
                    <label key={item.id} className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${form.shippingId === item.id ? "border-black bg-black/[0.03]" : "border-black/15 hover:border-black/40"}`}>
                      <span className="flex items-center gap-3">
                        <input type="radio" name="entrega" value={item.id} checked={form.shippingId === item.id} onChange={() => set("shippingId", item.id)} className="size-4 accent-[#b94f01]" />
                        <span>
                          <span className="block text-sm font-medium">{item.label}{item.id === "local" && item.carrier ? ` · ${item.carrier}` : ""}</span>
                          <span className="block text-xs text-black/60">{item.days}</span>
                        </span>
                      </span>
                      <span className="text-right text-sm">
                        {price === 0 ? "Grátis" : formatPrice(price)}
                        {price === 0 && item.fullPriceCents ? <span className="block text-xs text-black/60 line-through">{formatPrice(item.fullPriceCents)}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-black/60">Informe o CEP em Entrega para ver as opções de envio.</p>
            )}
            {quoteError && <p role="alert" className="mt-3 text-sm text-[#b42318]">{quoteError}</p>}
            {quotes?.length ? <p className="mt-3 text-xs text-black/60">&quot;Chega em&quot; soma o prazo de envio do item mais demorado da sacola e o transporte.</p> : null}
            <DispatchSummary items={items} className="mt-2" />
            {errors.shippingId && <p className="mt-2 text-xs text-[#b42318]">{errors.shippingId}</p>}
          </fieldset>,
        )}

        {section(
          3,
          <div className="mt-6">
            {mpPublicKey ? (
              // Mercado Pago: o Brick oficial escolhe o meio e coleta os dados (inclusive o CPF quando exigido).
              cardDisplay.brand || cardDisplay.last4 ? (
                <div className="mb-6">
                  <DecorativeCard holder={form.name} display={cardDisplay} simulated={false} />
                </div>
              ) : null
            ) : (
              <>
                <fieldset>
                  <legend className="sr-only">Forma de pagamento</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["pix", "cartao", "boleto"] as const).map((method) => {
                      const selected = form.method === method;
                      const pix = method === "pix";
                      return (
                        <label key={method} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${pix ? "sm:col-span-2" : ""} ${selected ? "border-black bg-black/[0.03]" : "border-black/15 hover:border-black/40"}`}>
                          <input type="radio" name="pagamento" value={method} checked={selected} onChange={() => set("method", method)} className="size-4 shrink-0 accent-[#b94f01]" />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2 font-medium">
                              {PAYMENT_LABELS[method]}
                              {pix && pixPercent > 0 && <span className="rounded-md bg-[#b94f01] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">{pixPercent}% off</span>}
                            </span>
                            {pix && <span className="mt-0.5 block text-xs text-black/60">Aprovação na hora{pixPercent > 0 ? ` · ${formatPrice(subtotalCents - discountCents - pixCents + shippingCents - shippingDiscountCents)} no total` : ""}</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                {form.method === "cartao" && (
                  <div className="mt-6">
                    <DecorativeCard holder={form.name} />
                  </div>
                )}
                {/* CPF só no boleto (o boleto registrado exige o CPF do pagador). Pix e cartão não pedem. */}
                {needsCpf && (
                  <div className="mt-6 max-w-sm">
                    <Field label="CPF" error={errors.cpf} hint="Obrigatório para emitir o boleto registrado. Não fica salvo no aparelho.">
                      {(p) => <input {...p} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => set("cpf", maskCpf(e.target.value))} onBlur={() => checkField("cpf")} className={inputClass(!!errors.cpf)} />}
                    </Field>
                  </div>
                )}
                <p className="mt-4 rounded-xl bg-[#f5f5f3] p-4 text-xs leading-5 text-black/65">
                  {form.method === "cartao"
                    ? "Pagamento simulado: os dados do cartão serão pedidos pelo provedor de pagamento quando ele for integrado. Nenhum número de cartão é digitado ou guardado aqui."
                    : form.method === "pix"
                      ? "Pagamento simulado: após confirmar, aparecerão as instruções do Pix."
                      : "Pagamento simulado: após confirmar, aparecerão as instruções do boleto."}
                </p>
              </>
            )}
            <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-6">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => set("acceptTerms", e.target.checked)}
                aria-invalid={Boolean(errors.acceptTerms)}
                aria-describedby={errors.acceptTerms ? "aceite-erro" : undefined}
                className="mt-1 size-4 shrink-0 accent-[#b94f01]"
              />
              <span>
                Li e aceito os{" "}
                <Link href="/termos-de-uso" target="_blank" className="underline underline-offset-4">Termos de Uso</Link> e a{" "}
                <Link href="/politica-de-privacidade" target="_blank" className="underline underline-offset-4">Política de Privacidade</Link>.
              </span>
            </label>
            {errors.acceptTerms && <p id="aceite-erro" className="mt-1.5 pl-7 text-xs text-[#b42318]">{errors.acceptTerms}</p>}

            {submitError && <p role="alert" className="mt-5 rounded-xl border border-[#b42318]/30 bg-[#b42318]/5 p-4 text-sm text-[#b42318]">{submitError}</p>}

            {mpPublicKey ? (
              readyToPay ? (
                <div className="mt-6">
                  <MercadoPagoBrick
                    publicKey={mpPublicKey}
                    amountCents={totalCents}
                    email={form.email}
                    onCard={(display) => setCardDisplay((current) => ({ ...current, ...display }))}
                    onSubmit={submitBrick}
                  />
                </div>
              ) : (
                <p className="mt-6 rounded-xl bg-[#f5f5f3] p-4 text-sm text-black/65">Preencha contato, entrega e envio para escolher como pagar.</p>
              )
            ) : (
              <button type="button" onClick={submit} disabled={pending} className="mt-6 hidden w-full items-center justify-center gap-2 rounded-xl bg-[#b94f01] px-6 py-4 text-sm font-medium text-white transition hover:bg-[#9f4300] disabled:opacity-70 lg:flex">
                {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                {confirmLabel}
              </button>
            )}
          </div>,
        )}
      </div>

      {/* Resumo do pedido: fixo ao rolar no desktop; recolhível (e acima do formulário) no celular. */}
      <aside aria-labelledby="resumo" className="order-first h-fit rounded-2xl bg-[#f5f5f3] p-5 sm:p-6 lg:sticky lg:top-24 lg:order-none">
        <h2 id="resumo" className="font-ui text-lg font-medium tracking-[-0.03em]">
          <button type="button" aria-expanded={summaryOpen} aria-controls="resumo-conteudo" onClick={() => setSummaryOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black lg:hidden">
            <span>Resumo <span className="text-sm font-normal text-black/60">({items.reduce((sum, item) => sum + item.quantity, 0)} {items.length === 1 && items[0].quantity === 1 ? "item" : "itens"})</span></span>
            <span className="flex items-center gap-2 text-base">
              {formatPrice(totalCents)}
              <ChevronDown size={18} aria-hidden="true" className={`text-black/50 transition-transform duration-[var(--motion-short)] ${summaryOpen ? "rotate-180" : ""}`} />
            </span>
          </button>
          <span className="hidden lg:inline">Resumo</span>
        </h2>
        <div id="resumo-conteudo" className={`${summaryOpen ? "block" : "hidden"} lg:block`}>
          <ul role="list" className="mt-5 flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.sku} className="flex gap-3">
                <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-xl bg-[#e9e8e4]">
                  {item.image && <Image src={item.image} alt="" fill sizes="56px" quality={75} className="object-cover" />}
                </div>
                <div className="flex min-w-0 flex-1 justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-black/60">Tam. {item.size} · Qtd. {item.quantity}</p>
                    {item.fulfillment === "sob_encomenda" && item.dispatchDays && <p className="text-xs text-black/60">Sob encomenda · {daysLabel(item.dispatchDays)}</p>}
                  </div>
                  <p className="whitespace-nowrap">{formatPrice(item.priceCents * item.quantity)}</p>
                </div>
              </li>
            ))}
          </ul>
          {couponsEnabled && (
            <CouponField
              items={items.map((item) => ({ sku: item.sku, quantity: item.quantity }))}
              cep={option ? cepDigits : undefined}
              shippingId={option?.id}
              onApplied={setCoupon}
              className="mt-6"
            />
          )}
          <dl className="mt-6 flex flex-col gap-2 border-t border-black/10 pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-black/60">Subtotal</dt><dd>{formatPrice(subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-black/60">{option ? `Envio (${option.label})` : "Envio"}</dt><dd>{option ? (shippingCents === 0 ? "Grátis" : formatPrice(shippingCents)) : <span className="text-black/60">calculado após o CEP</span>}</dd></div>
            {discountCents > 0 && <div className="flex justify-between"><dt className="text-black/60">Cupom {coupon?.code}</dt><dd>−{formatPrice(discountCents)}</dd></div>}
            {shippingDiscountCents > 0 && <div className="flex justify-between"><dt className="text-black/60">Frete grátis ({coupon?.code})</dt><dd>−{formatPrice(shippingDiscountCents)}</dd></div>}
            {pixApplied > 0 && <div className="flex justify-between"><dt className="text-black/60">Desconto no Pix ({pixPercent}%)</dt><dd>−{formatPrice(pixApplied)}</dd></div>}
            <div className="mt-2 flex justify-between border-t border-black/10 pt-3 text-base font-medium"><dt>Total</dt><dd>{formatPrice(totalCents)}</dd></div>
            {pixCents > 0 && !pixApplied && <div className="flex justify-between text-black" data-pix-price><dt>No Pix ({pixPercent}% off)</dt><dd className="font-medium">{formatPrice(totalCents - pixCents)}</dd></div>}
          </dl>
          <DispatchSummary items={items} className="mt-4" />
          <Link href="/carrinho" className="mt-5 inline-flex min-h-11 items-center text-xs text-black/60 underline underline-offset-4 hover:text-black">Editar sacola</Link>
        </div>
      </aside>

      {/* Celular: botão de finalizar sempre à mão (no Mercado Pago, leva ao pagamento). */}
      <div data-buy-bar className="fixed inset-x-0 bottom-0 z-[70] border-t border-black/10 bg-white/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 text-black backdrop-blur lg:hidden">
        {mpPublicKey ? (
          <button type="button" onClick={() => document.getElementById("secao-pagamento")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#b94f01] px-6 text-sm font-medium text-white transition hover:bg-[#9f4300]">
            Ir para o pagamento · {formatPrice(totalCents)}
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={pending} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#b94f01] px-6 text-sm font-medium text-white transition hover:bg-[#9f4300] disabled:opacity-70">
            {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        )}
      </div>
    </div>
  );
}
