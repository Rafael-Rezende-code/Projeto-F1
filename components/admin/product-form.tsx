"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { saveProduct, setProductStatus } from "@/app/admin/produtos/actions";
import { slugify, type ProductForm } from "@/lib/admin/product-schema";
import { createAdminBrowserClient } from "@/lib/supabase/browser";

type Options = { categories: { slug: string; name: string }[]; teams: { slug: string; name: string }[]; drivers: { slug: string; name: string; team_slug: string }[] };

const EMPTY: ProductForm = {
  name: "",
  slug: "",
  description: "",
  details: [
    { label: "Material", value: "" },
    { label: "Caimento", value: "" },
    { label: "Cuidados", value: "" },
  ],
  detailsPending: true,
  price: "",
  compareAtPrice: "",
  categorySlug: "",
  teamSlug: "",
  driverSlug: "",
  tags: "",
  isNew: false,
  featured: false,
  status: "draft",
  variants: [{ sku: "", size: "Único", color: "", stock: 0 }],
  images: [],
};

const input = "w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black/10";
const label = "mb-1.5 block text-xs font-medium text-black/70";

// Formulário de produto do painel (fase 11): dados, preços (em reais), categoria/equipe/piloto, status
// (rascunho/publicado/arquivado), variantes com estoque, ficha e fotos (envio direto para o Supabase Storage, bucket
// "produtos", com a sessão do administrador). Validação no servidor (lib/admin/product-schema.ts).
export function ProductFormView({ options, initial, code }: { options: Options; initial?: ProductForm; code?: string | null }) {
  const router = useRouter();
  const [form, setForm] = useState<ProductForm>(initial ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const editing = Boolean(form.id);

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const error = (key: string) => errors[key] && <p className="mt-1 text-xs text-[#b42318]">{errors[key]}</p>;

  const submit = () =>
    start(async () => {
      setMessage(null);
      const result = await saveProduct(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage({ tone: "error", text: result.message });
        return;
      }
      setErrors({});
      setMessage({ tone: "ok", text: "Produto salvo. A loja já mostra a versão nova." });
      if (!form.id) router.replace(`/admin/produtos/${result.id}`);
      else router.refresh();
    });

  const archive = () =>
    start(async () => {
      if (!form.id || !window.confirm("Arquivar este produto? Ele some da loja, mas fica no painel e nos pedidos antigos.")) return;
      const result = await setProductStatus(form.id, "archived");
      if (result.ok) {
        set("status", "archived");
        setMessage({ tone: "ok", text: "Produto arquivado." });
      } else setMessage({ tone: "error", text: result.message });
    });

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setMessage(null);
    const supabase = createAdminBrowserClient();
    const added: ProductForm["images"] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
        setMessage({ tone: "error", text: `${file.name}: envie imagens de até 8 MB.` });
        continue;
      }
      const path = `${form.slug || slugify(form.name) || "produto"}/${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${file.name.split(".").pop()?.toLowerCase()}`;
      const { error: uploadError } = await supabase.storage.from("produtos").upload(path, file, { cacheControl: "31536000", upsert: false });
      if (uploadError) {
        setMessage({ tone: "error", text: `Falha ao enviar ${file.name}: ${uploadError.message}` });
        continue;
      }
      added.push({ src: supabase.storage.from("produtos").getPublicUrl(path).data.publicUrl, alt: form.name, storagePath: path });
    }
    setForm((current) => ({ ...current, images: [...current.images, ...added] }));
    setUploading(false);
  };

  const moveImage = (index: number, delta: number) =>
    setForm((current) => {
      const images = [...current.images];
      const target = index + delta;
      if (target < 0 || target >= images.length) return current;
      [images[index], images[target]] = [images[target], images[index]];
      return { ...current, images };
    });

  return (
    <div>
      <Link href="/admin/produtos" className="text-sm text-black/60 hover:underline">← Produtos</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl tracking-[-0.05em]">{editing ? form.name || "Produto" : "Novo produto"}</h1>
        {editing && (
          <a href={`/produtos/${form.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-black/60 underline underline-offset-4">
            Ver na loja <span className="sr-only">(abre em nova aba)</span>
          </a>
        )}
      </div>
      {code && <p className="mt-1 text-xs text-black/60">Código {code}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6">
            <h2 className="font-medium">Dados</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label} htmlFor="nome">Nome</label>
                <input id="nome" className={input} value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value, slug: editing || c.slug !== slugify(c.name) ? c.slug : slugify(e.target.value) }))} />
                {error("name")}
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="slug">Endereço (slug)</label>
                <input id="slug" className={input} value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} />
                <p className="mt-1 text-xs text-black/60">/produtos/{form.slug || "…"}</p>
                {error("slug")}
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="descricao">Descrição (parágrafos separados por uma linha em branco)</label>
                <textarea id="descricao" rows={6} className={input} value={form.description} onChange={(e) => set("description", e.target.value)} />
                {error("description")}
              </div>
              <div>
                <label className={label} htmlFor="preco">Preço (R$)</label>
                <input id="preco" inputMode="decimal" placeholder="199,90" className={input} value={form.price} onChange={(e) => set("price", e.target.value)} />
                {error("price")}
              </div>
              <div>
                <label className={label} htmlFor="preco-de">Preço &quot;de&quot; (opcional)</label>
                <input id="preco-de" inputMode="decimal" placeholder="249,90" className={input} value={form.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} />
                {error("compareAtPrice")}
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Variantes e estoque</h2>
              <button type="button" onClick={() => set("variants", [...form.variants, { sku: "", size: "", color: "", stock: 0 }])} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm hover:bg-black/5">
                <Plus size={16} aria-hidden="true" /> Variante
              </button>
            </div>
            {error("variants")}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs text-black/60">
                  <tr><th className="pb-2 font-medium">SKU</th><th className="pb-2 font-medium">Tamanho</th><th className="pb-2 font-medium">Cor</th><th className="pb-2 font-medium">Estoque</th><th className="sr-only">Remover</th></tr>
                </thead>
                <tbody>
                  {form.variants.map((variant, index) => {
                    const update = (patch: Partial<typeof variant>) => set("variants", form.variants.map((item, i) => (i === index ? { ...item, ...patch } : item)));
                    return (
                      <tr key={index}>
                        <td className="pb-2 pr-2"><input aria-label={`SKU da variante ${index + 1}`} className={input} value={variant.sku} onChange={(e) => update({ sku: e.target.value.toUpperCase().replace(/\s/g, "") })} /></td>
                        <td className="pb-2 pr-2"><input aria-label={`Tamanho da variante ${index + 1}`} className={input} value={variant.size} onChange={(e) => update({ size: e.target.value })} /></td>
                        <td className="pb-2 pr-2"><input aria-label={`Cor da variante ${index + 1}`} className={input} value={variant.color} onChange={(e) => update({ color: e.target.value })} /></td>
                        <td className="pb-2 pr-2"><input aria-label={`Estoque da variante ${index + 1}`} type="number" min={0} className={input} value={variant.stock} onChange={(e) => update({ stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} /></td>
                        <td className="pb-2">
                          <button type="button" aria-label={`Remover variante ${index + 1}`} disabled={form.variants.length === 1} onClick={() => set("variants", form.variants.filter((_, i) => i !== index))} className="rounded-xl p-2 text-black/60 hover:bg-black/5 disabled:opacity-30">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {Object.keys(errors).some((key) => key.startsWith("variants.")) && <p className="mt-1 text-xs text-[#b42318]">Confira SKU, tamanho e estoque das variantes.</p>}
          </section>

          <section className="rounded-2xl bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-medium">Fotos</h2>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-[#b94f01] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black">
                {uploading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
                {uploading ? "Enviando…" : "Enviar fotos"}
                <input type="file" accept="image/*" multiple className="sr-only" disabled={uploading} onChange={(e) => upload(e.target.files)} />
              </label>
            </div>
            {error("images")}
            <p className="mt-2 text-xs text-black/60">A primeira é a foto principal; a segunda aparece no hover do card. Até 8 MB por foto.</p>
            <ul role="list" className="mt-4 space-y-3">
              {form.images.map((image, index) => (
                <li key={image.src} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- prévia no painel */}
                  <img src={image.src} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
                  <input aria-label={`Texto alternativo da foto ${index + 1}`} className={input} placeholder="Descrição da foto (acessibilidade)" value={image.alt} onChange={(e) => set("images", form.images.map((item, i) => (i === index ? { ...item, alt: e.target.value } : item)))} />
                  <button type="button" aria-label="Subir foto" onClick={() => moveImage(index, -1)} className="rounded-xl p-2 hover:bg-black/5"><ArrowUp size={16} /></button>
                  <button type="button" aria-label="Descer foto" onClick={() => moveImage(index, 1)} className="rounded-xl p-2 hover:bg-black/5"><ArrowDown size={16} /></button>
                  <button type="button" aria-label="Remover foto" onClick={() => set("images", form.images.filter((_, i) => i !== index))} className="rounded-xl p-2 text-black/60 hover:bg-black/5"><Trash2 size={16} /></button>
                </li>
              ))}
              {form.images.length === 0 && <li className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/60">Nenhuma foto ainda.</li>}
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-6">
            <h2 className="font-medium">Ficha (material, caimento, cuidados)</h2>
            <div className="mt-4 space-y-2">
              {form.details.map((detail, index) => (
                <div key={index} className="grid grid-cols-[140px_minmax(0,1fr)_auto] gap-2">
                  <input aria-label={`Item ${index + 1} da ficha`} className={input} value={detail.label} onChange={(e) => set("details", form.details.map((d, i) => (i === index ? { ...d, label: e.target.value } : d)))} />
                  <input aria-label={`Valor do item ${index + 1}`} className={input} value={detail.value} onChange={(e) => set("details", form.details.map((d, i) => (i === index ? { ...d, value: e.target.value } : d)))} />
                  <button type="button" aria-label={`Remover item ${index + 1}`} onClick={() => set("details", form.details.filter((_, i) => i !== index))} className="rounded-xl p-2 text-black/60 hover:bg-black/5"><Trash2 size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={() => set("details", [...form.details, { label: "", value: "" }])} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm hover:bg-black/5"><Plus size={16} aria-hidden="true" /> Item</button>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.detailsPending} onChange={(e) => set("detailsPending", e.target.checked)} className="size-4 accent-[#b94f01]" /> Ficha ainda não conferida (mostra &quot;[CONFERIR COM O PRODUTO REAL]&quot;)</label>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl bg-white p-6">
            <h2 className="font-medium">Publicação</h2>
            <fieldset className="mt-4 space-y-2 text-sm">
              <legend className="sr-only">Status</legend>
              {([["draft", "Rascunho (não aparece na loja)"], ["active", "Publicado"], ["archived", "Arquivado"]] as const).map(([value, text]) => (
                <label key={value} className="flex items-center gap-2"><input type="radio" name="status" checked={form.status === value} onChange={() => set("status", value)} className="size-4 accent-[#b94f01]" /> {text}</label>
              ))}
            </fieldset>
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isNew} onChange={(e) => set("isNew", e.target.checked)} className="size-4 accent-[#b94f01]" /> Selo &quot;Novo&quot;</label>
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="size-4 accent-[#b94f01]" /> Destaque (VELOCIDADE e topo do piloto)</label>
          </section>

          <section className="rounded-2xl bg-white p-6">
            <h2 className="font-medium">Organização</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className={label} htmlFor="categoria">Categoria</label>
                <select id="categoria" className={input} value={form.categorySlug} onChange={(e) => set("categorySlug", e.target.value)}>
                  <option value="">Escolha…</option>
                  {options.categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
                </select>
                {error("categorySlug")}
              </div>
              <div>
                <label className={label} htmlFor="equipe">Equipe</label>
                <select id="equipe" className={input} value={form.teamSlug} onChange={(e) => set("teamSlug", e.target.value)}>
                  <option value="">Nenhuma</option>
                  {options.teams.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="piloto">Piloto</label>
                <select id="piloto" className={input} value={form.driverSlug} onChange={(e) => { const driver = options.drivers.find((d) => d.slug === e.target.value); setForm((c) => ({ ...c, driverSlug: e.target.value, teamSlug: driver ? driver.team_slug : c.teamSlug })); }}>
                  <option value="">Nenhum</option>
                  {options.drivers.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="tags">Tags (separadas por vírgula; entram na busca)</label>
                <input id="tags" className={input} value={form.tags} onChange={(e) => set("tags", e.target.value)} />
              </div>
            </div>
          </section>

          <div className="space-y-3">
            {message && <p role={message.tone === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${message.tone === "error" ? "bg-[#b42318]/5 text-[#b42318]" : "bg-[#1f7a3a]/10 text-[#1f7a3a]"}`}>{message.text}</p>}
            <button type="button" onClick={submit} disabled={pending || uploading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b94f01] px-5 py-3.5 text-sm font-medium text-white hover:bg-[#9f4300] disabled:opacity-60">
              {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Salvar produto
            </button>
            {editing && form.status !== "archived" && (
              <button type="button" onClick={archive} disabled={pending} className="w-full rounded-xl border border-black/15 bg-white px-5 py-3 text-sm hover:border-[#b42318] hover:text-[#b42318]">Arquivar</button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
