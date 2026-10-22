import { BRAND } from "@/lib/brand";

// Identificação do fornecedor (Decreto 7.962/2013, art. 2º: nome empresarial, CNPJ/CPF, endereço físico e eletrônico
// e meios de contato). Todos os campos são OPCIONAIS: rodapé, /sobre e /contato mostram só os preenchidos, sem
// placeholders para o público. Preencha aqui à medida que os dados existirem (antes de vender, o decreto exige o nome
// empresarial, o CNPJ ou CPF e o endereço). O e-mail também pode vir de NEXT_PUBLIC_CONTACT_EMAIL (Vercel).
export type Company = {
  /** Nome da loja (marca). */
  tradeName: string;
  legalName?: string;
  /** CNPJ ou CPF, já formatado. */
  document?: string;
  address?: string;
  email?: string;
  phone?: string;
  hours?: string;
};

const clean = (value?: string) => (value && value.trim() ? value.trim() : undefined);

export const company: Company = {
  tradeName: BRAND.name,
  legalName: undefined,
  document: undefined,
  address: undefined,
  email: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  phone: undefined,
  hours: undefined,
};

/** "CNPJ" (14 dígitos) ou "CPF" (11), pelo número de dígitos. */
export const documentLabel = (document: string) => (document.replace(/\D/g, "").length === 11 ? "CPF" : "CNPJ");

/** Dados preenchidos, na ordem de exibição, com rótulo. Só o que existe. */
export function companyFacts(source: Company = company) {
  const facts: { key: keyof Company; label: string; value: string; href?: string }[] = [];
  if (source.legalName) facts.push({ key: "legalName", label: "Razão social", value: source.legalName });
  if (source.document) facts.push({ key: "document", label: documentLabel(source.document), value: source.document });
  if (source.address) facts.push({ key: "address", label: "Endereço", value: source.address });
  if (source.email) facts.push({ key: "email", label: "E-mail", value: source.email, href: `mailto:${source.email}` });
  if (source.phone) facts.push({ key: "phone", label: "Telefone", value: source.phone, href: `tel:+55${source.phone.replace(/\D/g, "")}` });
  if (source.hours) facts.push({ key: "hours", label: "Horário", value: source.hours });
  return facts;
}
