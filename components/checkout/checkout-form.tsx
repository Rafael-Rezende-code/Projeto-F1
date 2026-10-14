"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useCart } from "@/components/cart";
import { placeOrder } from "@/app/(loja)/checkout/actions";
import { ORDER_STORAGE_PREFIX, PAYMENT_LABELS } from "@/lib/checkout/order";
import { addressSchema, contactSchema, fieldErrors, paymentSchema, shippingSchema } from "@/lib/checkout/schema";
import { SHIPPING_OPTIONS, shippingPrice } from "@/lib/checkout/shipping";
import { formatPrice } from "@/lib/format";
import { maskCep, maskCpf, maskPhone, onlyDigits, UFS } from "@/lib/validators/br";

type Step = 0 | 1 | 2 | 3;
const STEPS = ["Contato", "Endereço", "Entrega", "Pagamento"] as const;

type Form = {
  name: string; email: string; phone: string; cpf: string;
  cep: string; street: string; number: string; complement: string; district: string; city: string; state: string;
  shippingId: string; method: string; acceptTerms: boolean;
};
const EMPTY: Form = { name: "", email: "", phone: "", cpf: "", cep: "", street: "", number: "", complement: "", district: "", city: "", state: "", shippingId: "economica", method: "pix", acceptTerms: false };

const inputClass = (invalid: boolean) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-black/35 focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black/10 ${invalid ? "border-[#b42318]" : "border-black/15 hover:border-black/40"}`;

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

export function CheckoutForm() {
  const router = useRouter();
  const { items, subtotalCents, ready, clear } = useCart();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cepStatus, setCepStatus] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [pending, startTransition] = useTransition();
  const cepRequest = useRef<AbortController | null>(null);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: "" } : current));
  };

  const option = SHIPPING_OPTIONS.find((item) => item.id === form.shippingId) ?? SHIPPING_OPTIONS[0];
  const shippingCents = shippingPrice(option, subtotalCents);

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

  const validateStep = (target: Step) => {
    const schema = [contactSchema, addressSchema, shippingSchema, paymentSchema][target];
    const values = [
      { name: form.name, email: form.email, phone: form.phone, cpf: form.cpf },
      { cep: form.cep, street: form.street, number: form.number, complement: form.complement || undefined, district: form.district, city: form.city, state: form.state },
      { shippingId: form.shippingId },
      { method: form.method, acceptTerms: form.acceptTerms },
    ][target];
    const result = schema.safeParse(values);
    if (result.success) return true;
    setErrors(fieldErrors(result.error));
    // leva o foco ao primeiro campo com erro
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
    return false;
  };

  const goTo = (next: Step) => {
    setStep(next);
    window.requestAnimationFrame(() => headingRefs.current[next]?.focus());
  };

  const next = () => {
    if (validateStep(step) && step < 3) goTo((step + 1) as Step);
  };

  const submit = () => {
    if (!validateStep(3)) return;
    setSubmitError("");
    startTransition(async () => {
      const result = await placeOrder({
        contact: { name: form.name, email: form.email, phone: form.phone, cpf: form.cpf },
        address: { cep: form.cep, street: form.street, number: form.number, complement: form.complement || undefined, district: form.district, city: form.city, state: form.state },
        shipping: { shippingId: form.shippingId },
        payment: { method: form.method, acceptTerms: form.acceptTerms },
        items: items.map((item) => ({ sku: item.sku, quantity: item.quantity })),
      });
      if (!result.ok) {
        setSubmitError(result.message);
        if (result.errors) setErrors(Object.fromEntries(Object.entries(result.errors).map(([key, value]) => [key.split(".").pop() as string, value])));
        return;
      }
      try {
        window.sessionStorage.setItem(ORDER_STORAGE_PREFIX + result.order.id, JSON.stringify(result.order));
      } catch {
        // sem sessionStorage: a página do pedido mostra só o número
      }
      clear();
      router.push(`/pedido/${result.order.id}`);
    });
  };

  if (!ready) return <p className="py-16 text-sm text-black/60">Carregando a sacola…</p>;
  if (items.length === 0)
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-[#f5f5f3] px-6 py-16 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Sacola vazia</p>
        <h2 className="mt-3 text-2xl font-medium tracking-[-0.05em]">Não há o que finalizar.</h2>
        <Link href="/produtos" className="mt-6 inline-flex rounded-xl bg-black px-6 py-3 text-xs font-medium text-white transition hover:bg-[#b94f01]">Ver a coleção</Link>
      </div>
    );

  const sectionHeader = (index: Step) => (
    <div className="flex items-start justify-between gap-4">
      <h2 ref={(el) => { headingRefs.current[index] = el; }} tabIndex={-1} className="flex items-center gap-3 text-lg font-medium tracking-[-0.03em] outline-none">
        <span aria-hidden="true" className={`flex size-7 items-center justify-center rounded-full text-xs ${index < step ? "bg-black text-white" : index === step ? "bg-[#b94f01] text-white" : "bg-black/10 text-black/60"}`}>
          {index < step ? <Check size={14} /> : index + 1}
        </span>
        {STEPS[index]}
        {index < step && <span className="sr-only">(concluído)</span>}
      </h2>
      {index < step && (
        <button type="button" onClick={() => goTo(index)} className="text-xs text-black/60 underline underline-offset-4 hover:text-black">
          Editar<span className="sr-only"> {STEPS[index].toLowerCase()}</span>
        </button>
      )}
    </div>
  );

  const continueButton = (label = "Continuar") => (
    <button type="button" onClick={next} className="mt-6 w-full rounded-xl bg-black px-6 py-3.5 text-sm font-medium text-white transition hover:bg-[#b94f01] sm:w-auto">
      {label}
    </button>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
      <ol className="flex flex-col gap-4" aria-label="Etapas do checkout">
        {/* 1. Contato */}
        <li className="rounded-2xl border border-black/10 p-5 sm:p-7">
          {sectionHeader(0)}
          {step === 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo" error={errors.name} className="sm:col-span-2">
                {(p) => <input {...p} autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass(!!errors.name)} />}
              </Field>
              <Field label="E-mail" error={errors.email}>
                {(p) => <input {...p} type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass(!!errors.email)} />}
              </Field>
              <Field label="Telefone" error={errors.phone}>
                {(p) => <input {...p} type="tel" autoComplete="tel-national" inputMode="tel" placeholder="(11) 91234-5678" value={form.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} className={inputClass(!!errors.phone)} />}
              </Field>
              <Field label="CPF" error={errors.cpf} hint="Necessário para a nota fiscal.">
                {(p) => <input {...p} inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => set("cpf", maskCpf(e.target.value))} className={inputClass(!!errors.cpf)} />}
              </Field>
              <div className="sm:col-span-2">{continueButton()}</div>
            </div>
          ) : step > 0 ? (
            <p className="mt-3 pl-10 text-sm text-black/60">{form.name} · {form.email} · {form.phone}</p>
          ) : null}
        </li>

        {/* 2. Endereço */}
        <li className="rounded-2xl border border-black/10 p-5 sm:p-7">
          {sectionHeader(1)}
          {step === 1 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-6">
              <Field label="CEP" error={errors.cep} className="sm:col-span-2">
                {(p) => (
                  <input
                    {...p}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="00000-000"
                    value={form.cep}
                    onChange={(e) => {
                      const masked = maskCep(e.target.value);
                      set("cep", masked);
                      const digits = onlyDigits(masked);
                      if (digits.length === 8) void lookupCep(digits);
                      else setCepStatus(null);
                    }}
                    className={inputClass(!!errors.cep)}
                  />
                )}
              </Field>
              <p aria-live="polite" className={`self-end pb-3 text-xs sm:col-span-4 ${cepStatus?.tone === "error" ? "text-[#b42318]" : "text-black/60"}`}>
                {cepStatus?.text}
              </p>
              <Field label="Rua" error={errors.street} className="sm:col-span-4">
                {(p) => <input {...p} autoComplete="address-line1" value={form.street} onChange={(e) => set("street", e.target.value)} className={inputClass(!!errors.street)} />}
              </Field>
              <Field label="Número" error={errors.number} className="sm:col-span-2">
                {(p) => <input {...p} value={form.number} onChange={(e) => set("number", e.target.value)} className={inputClass(!!errors.number)} />}
              </Field>
              <Field label="Complemento (opcional)" error={errors.complement} className="sm:col-span-3">
                {(p) => <input {...p} autoComplete="address-line2" value={form.complement} onChange={(e) => set("complement", e.target.value)} className={inputClass(!!errors.complement)} />}
              </Field>
              <Field label="Bairro" error={errors.district} className="sm:col-span-3">
                {(p) => <input {...p} value={form.district} onChange={(e) => set("district", e.target.value)} className={inputClass(!!errors.district)} />}
              </Field>
              <Field label="Cidade" error={errors.city} className="sm:col-span-4">
                {(p) => <input {...p} autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass(!!errors.city)} />}
              </Field>
              <Field label="Estado" error={errors.state} className="sm:col-span-2">
                {(p) => (
                  <select {...p} autoComplete="address-level1" value={form.state} onChange={(e) => set("state", e.target.value)} className={inputClass(!!errors.state)}>
                    <option value="">UF</option>
                    {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                )}
              </Field>
              <div className="sm:col-span-6">{continueButton()}</div>
            </div>
          ) : step > 1 ? (
            <p className="mt-3 pl-10 text-sm text-black/60">
              {form.street}, {form.number}{form.complement ? ` – ${form.complement}` : ""} · {form.district} · {form.city}/{form.state} · {form.cep}
            </p>
          ) : null}
        </li>

        {/* 3. Entrega */}
        <li className="rounded-2xl border border-black/10 p-5 sm:p-7">
          {sectionHeader(2)}
          {step === 2 ? (
            <fieldset className="mt-6">
              <legend className="sr-only">Forma de entrega</legend>
              <div className="flex flex-col gap-3">
                {SHIPPING_OPTIONS.map((item) => {
                  const price = shippingPrice(item, subtotalCents);
                  return (
                    <label key={item.id} className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${form.shippingId === item.id ? "border-black bg-black/[0.03]" : "border-black/15 hover:border-black/40"}`}>
                      <span className="flex items-center gap-3">
                        <input type="radio" name="entrega" value={item.id} checked={form.shippingId === item.id} onChange={() => set("shippingId", item.id)} className="size-4 accent-[#b94f01]" />
                        <span>
                          <span className="block text-sm font-medium">{item.label}</span>
                          <span className="block text-xs text-black/60">{item.days}</span>
                        </span>
                      </span>
                      <span className="text-sm">{price === 0 ? "Grátis" : formatPrice(price)}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-black/60">Prazos e valores simulados (sem transportadora integrada).</p>
              {errors.shippingId && <p className="mt-2 text-xs text-[#b42318]">{errors.shippingId}</p>}
              {continueButton()}
            </fieldset>
          ) : step > 2 ? (
            <p className="mt-3 pl-10 text-sm text-black/60">{option.label} · {option.days} · {shippingCents === 0 ? "Grátis" : formatPrice(shippingCents)}</p>
          ) : null}
        </li>

        {/* 4. Pagamento */}
        <li className="rounded-2xl border border-black/10 p-5 sm:p-7">
          {sectionHeader(3)}
          {step === 3 && (
            <div className="mt-6">
              <fieldset>
                <legend className="sr-only">Forma de pagamento</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["pix", "cartao", "boleto"] as const).map((method) => (
                    <label key={method} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${form.method === method ? "border-black bg-black/[0.03]" : "border-black/15 hover:border-black/40"}`}>
                      <input type="radio" name="pagamento" value={method} checked={form.method === method} onChange={() => set("method", method)} className="size-4 accent-[#b94f01]" />
                      {PAYMENT_LABELS[method]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="mt-4 rounded-xl bg-[#f5f5f3] p-4 text-xs leading-5 text-black/65">
                {form.method === "cartao"
                  ? "Pagamento simulado: os dados do cartão serão pedidos pelo provedor de pagamento quando ele for integrado. Nenhum número de cartão é digitado ou guardado aqui."
                  : form.method === "pix"
                    ? "Pagamento simulado: após confirmar, aparecerão as instruções do Pix."
                    : "Pagamento simulado: após confirmar, aparecerão as instruções do boleto."}
              </p>

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

              <button type="button" onClick={submit} disabled={pending} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#b94f01] px-6 py-4 text-sm font-medium text-white transition hover:bg-[#9f4300] disabled:opacity-70">
                {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                {pending ? "Confirmando pedido…" : `Confirmar pedido · ${formatPrice(subtotalCents + shippingCents)}`}
              </button>
            </div>
          )}
        </li>
      </ol>

      {/* Resumo do pedido */}
      <aside aria-labelledby="resumo" className="h-fit rounded-2xl bg-[#f5f5f3] p-6 lg:sticky lg:top-24">
        <h2 id="resumo" className="text-lg font-medium tracking-[-0.03em]">Resumo</h2>
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
                </div>
                <p className="whitespace-nowrap">{formatPrice(item.priceCents * item.quantity)}</p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-6 flex flex-col gap-2 border-t border-black/10 pt-5 text-sm">
          <div className="flex justify-between"><dt className="text-black/60">Subtotal</dt><dd>{formatPrice(subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt className="text-black/60">Entrega ({option.label})</dt><dd>{shippingCents === 0 ? "Grátis" : formatPrice(shippingCents)}</dd></div>
          <div className="mt-2 flex justify-between border-t border-black/10 pt-3 text-base font-medium"><dt>Total</dt><dd>{formatPrice(subtotalCents + shippingCents)}</dd></div>
        </dl>
        <Link href="/carrinho" className="mt-5 inline-block text-xs text-black/60 underline underline-offset-4 hover:text-black">Editar sacola</Link>
      </aside>
    </div>
  );
}
