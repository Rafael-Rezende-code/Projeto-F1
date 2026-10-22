import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ConfirmText } from "@/components/confirm-text";
import { ImageReveal } from "@/components/motion/image-reveal";
import { SectionTitle } from "@/components/motion/section-title";
import { BRAND } from "@/lib/brand";
import { catalog } from "@/lib/catalog";
import { sobre } from "@/lib/content/sobre";
import { getInstitutionalPage } from "@/lib/institutional";

const page = getInstitutionalPage("sobre");

export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: "/sobre" } };

// /sobre (fase 8): manifesto, o que vendemos (as 4 categorias) e como trabalhamos (envio, trocas, atendimento).
// Dados da empresa ainda não definidos aparecem marcados [CONFIRMAR]. Sem texto jurídico.
export default async function SobrePage() {
  const categories = await catalog.getCategories();
  return (
    <div className="pb-24">
      <div className="px-5 pt-8 sm:px-10 sm:pt-10">
        <div className="mx-auto max-w-[1400px]">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: page.title }]} />
        </div>
      </div>

      {/* Manifesto */}
      <section aria-labelledby="manifesto" className="px-5 pt-12 sm:px-10 sm:pt-20">
        <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Manifesto</p>
            <h1 id="manifesto" className="text-5xl leading-[0.95] tracking-[-0.06em] text-black sm:text-7xl">
              {sobre.manifesto.title}
            </h1>
          </div>
          <div className="max-w-[60ch] space-y-6 text-lg leading-8 text-black/75 lg:pt-4">
            {sobre.manifesto.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {/* O que vendemos */}
      <section aria-labelledby="o-que-vendemos" className="mt-20 px-5 sm:mt-28 sm:px-10">
        <div className="mx-auto max-w-[1400px]">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">A coleção</p>
          <SectionTitle id="o-que-vendemos" text="O que vendemos" className="text-4xl font-medium tracking-[-0.06em] sm:text-5xl" />
          <p className="mt-5 max-w-[65ch] text-base leading-7 text-black/70">
            <ConfirmText text={sobre.whatWeSell.intro} />
          </p>
          <ul role="list" className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/categorias/${category.slug}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black rounded-2xl">
                  <ImageReveal className="relative isolate aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e8e4]">
                    <Image src={category.image} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" quality={75} className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </ImageReveal>
                  <p className="mt-4 flex items-center justify-between text-lg font-medium tracking-[-0.03em] text-black">
                    {category.name} <ArrowUpRight size={18} aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </p>
                  <p className="mt-1 text-sm leading-6 text-black/60">{category.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Como trabalhamos */}
      <section aria-labelledby="como-trabalhamos" className="mt-20 bg-[#f5f5f3] px-5 py-20 sm:mt-28 sm:px-10 sm:py-24">
        <div className="mx-auto max-w-[1400px]">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Do pedido à porta</p>
          <SectionTitle id="como-trabalhamos" text="Como trabalhamos" className="text-4xl font-medium tracking-[-0.06em] sm:text-5xl" />
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {sobre.howWeWork.map((item) => (
              <div key={item.title} className="border-t-2 border-black pt-6">
                <h3 className="text-xl font-medium tracking-[-0.03em] text-black">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-black/70">
                  <ConfirmText text={item.text} />
                </p>
                <Link href={item.href} className="group mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-black underline-offset-4 hover:underline">
                  Saiba mais <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fecho */}
      <section className="px-5 pt-20 text-center sm:px-10 sm:pt-28">
        <p className="mx-auto max-w-[24ch] text-3xl leading-tight tracking-[-0.04em] text-black sm:text-5xl">
          Bem-vindo ao grid da <span className="font-accent italic">{BRAND.name}</span>.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/produtos" className="inline-flex min-h-11 items-center gap-3 rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b94f01]">
            Ver a coleção <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/diario" className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-black/20 px-6 py-3 text-sm font-medium text-black transition hover:border-black">
            Ler o Diário
          </Link>
        </div>
      </section>
    </div>
  );
}
