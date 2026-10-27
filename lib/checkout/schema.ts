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
  // Id da cotação (lib/shipping): "economica", "expressa", "local", "melhorenvio-1"... O servidor cota de novo e confere.
  shippingId: z.string({ error: "Escolha a forma de entrega." }).regex(/^[a-z0-9-]{2,40}$/, "Escolha a forma de entrega."),
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
    // Dados do componente do provedor real (Mercado Pago: formData do Payment Brick). O provedor valida.
    providerData: z.unknown().optional(),
  })
  .superRefine((value, ctx) => {
    // Com o componente do provedor, ele mesmo pede o CPF quando o meio exige (boleto, cartão no Brasil).
    if (value.providerData !== undefined) return;
    if (!CPF_REQUIRED_METHODS.includes(value.method)) return;
    if (!value.cpf || !isValidCpf(value.cpf)) {
      ctx.addIssue({ code: "custom", path: ["cpf"], message: value.cpf ? "CPF inválido. Confira os números." : "Informe o CPF para emitir o boleto." });
    }
  });

// personalization (loja extra, item 3): texto bruto; o servidor normaliza e valida pela configuração do produto
// (lib/personalization.ts) e o banco confere de novo.
export const orderItemSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  personalization: z.object({ name: z.string().max(40).optional(), number: z.string().max(4).optional() }).optional(),
});

export const checkoutSchema = z.object({
  contact: contactSchema,
  address: addressSchema,
  shipping: shippingSchema,
  payment: paymentSchema,
  items: z.array(orderItemSchema).min(1, "A sacola está vazia."),
  // Cupom (opcional): só o código; o banco valida e calcula (operação, fase 1c).
  coupon: z.string().trim().max(40).optional(),
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
