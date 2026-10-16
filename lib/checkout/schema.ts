import { z } from "zod";
import { isValidCep, isValidCpf, isValidPhone, UFS } from "@/lib/validators/br";

// Validação do checkout (zod), usada no cliente (por etapa) e no servidor (server action, pedido inteiro).
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo.")
    .refine((value) => value.includes(" "), "Informe nome e sobrenome."),
  email: z.email("Informe um e-mail válido."),
  phone: z.string().refine(isValidPhone, "Informe um telefone com DDD."),
});

export const addressSchema = z.object({
  cep: z.string().refine(isValidCep, "O CEP deve ter 8 dígitos."),
  street: z.string().trim().min(2, "Informe a rua."),
  number: z.string().trim().min(1, "Informe o número (ou S/N)."),
  complement: z.string().trim().max(60, "Use até 60 caracteres.").optional(),
  district: z.string().trim().min(2, "Informe o bairro."),
  city: z.string().trim().min(2, "Informe a cidade."),
  state: z.enum(UFS, { error: "Escolha o estado." }),
});

export const shippingSchema = z.object({
  shippingId: z.enum(["economica", "expressa"], { error: "Escolha a forma de entrega." }),
});

export const PAYMENT_METHODS = ["pix", "cartao", "boleto"] as const;
/** Meios que exigem CPF (o boleto registrado exige o CPF do pagador). Pix e cartão não pedem CPF aqui. */
export const CPF_REQUIRED_METHODS: readonly (typeof PAYMENT_METHODS)[number][] = ["boleto"];
export const paymentSchema = z
  .object({
    method: z.enum(PAYMENT_METHODS, { error: "Escolha a forma de pagamento." }),
    // CPF só para os meios em CPF_REQUIRED_METHODS (validado abaixo); nos outros é ignorado.
    cpf: z.string().optional(),
    acceptTerms: z.literal(true, { error: "É preciso aceitar os Termos de Uso e a Política de Privacidade." }),
  })
  .superRefine((value, ctx) => {
    if (!CPF_REQUIRED_METHODS.includes(value.method)) return;
    if (!value.cpf || !isValidCpf(value.cpf)) {
      ctx.addIssue({ code: "custom", path: ["cpf"], message: value.cpf ? "CPF inválido. Confira os números." : "Informe o CPF para emitir o boleto." });
    }
  });

export const orderItemSchema = z.object({ sku: z.string().min(1), quantity: z.number().int().min(1).max(99) });

export const checkoutSchema = z.object({
  contact: contactSchema,
  address: addressSchema,
  shipping: shippingSchema,
  payment: paymentSchema,
  items: z.array(orderItemSchema).min(1, "A sacola está vazia."),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Erros do zod achatados como { "cpf": "mensagem" } (com prefixo opcional) para mostrar ao lado de cada campo. */
export function fieldErrors(error: z.ZodError, prefix = "") {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = prefix + issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
