import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageIntro } from "@/components/page-intro";
import { company } from "@/lib/company";
import { PLACEHOLDER, type InstitutionalPage } from "@/lib/institutional";

// Esqueleto de página institucional/legal: título, índice e seções com texto placeholder bem marcado.
function Placeholder() {
  return (
    <p className="mt-3 rounded-xl border border-dashed border-[#b94f01]/50 bg-[#b94f01]/5 px-4 py-3 text-sm font-medium text-[#8a3a00]">
      {PLACEHOLDER}
    </p>
  );
}

const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function InstitutionalPageView({ page }: { page: InstitutionalPage }) {
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: page.title }]} />
        <div className="mt-8">
          <PageIntro eyebrow={page.eyebrow} title={page.title} body={page.description} />
          {page.updatedLabel && <p className="mt-4 text-xs text-black/60">Última atualização: [DATA]</p>}
        </div>

        {page.sections.length > 1 && (
          <nav aria-label="Nesta página" className="mt-10 rounded-2xl bg-[#f5f5f3] p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60">Nesta página</p>
            <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
              {page.sections.map((section, index) => (
                <li key={section}>
                  <a href={`#${slugify(section)}`} className="text-black/70 underline-offset-4 hover:text-black hover:underline">
                    {index + 1}. {section}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mt-12 flex flex-col gap-10">
          {page.sections.map((section, index) => (
            <section key={section} id={slugify(section)} className="scroll-mt-24">
              <h2 className="text-2xl font-medium tracking-[-0.04em]">
                {page.sections.length > 1 ? `${index + 1}. ` : ""}
                {section}
              </h2>
              <Placeholder />
            </section>
          ))}

          {page.questions && (
            <div className="border-t border-black/10">
              {page.questions.map((question) => (
                <details key={question} className="group border-b border-black/10 py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
                    {question}
                    <span aria-hidden="true" className="text-xl transition group-open:rotate-45">+</span>
                  </summary>
                  <Placeholder />
                </details>
              ))}
            </div>
          )}

          {page.slug === "contato" && (
            <dl className="grid gap-4 rounded-2xl border border-black/10 p-6 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-black/60">E-mail</dt><dd className="mt-1">{company.email}</dd></div>
              <div><dt className="text-xs text-black/60">Telefone</dt><dd className="mt-1">{company.phone}</dd></div>
              <div><dt className="text-xs text-black/60">Horário</dt><dd className="mt-1">{company.hours}</dd></div>
              <div><dt className="text-xs text-black/60">Endereço</dt><dd className="mt-1">{company.address}</dd></div>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
