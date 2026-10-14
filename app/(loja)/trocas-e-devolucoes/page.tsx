import type { Metadata } from "next";
import { InstitutionalPageView } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional";

const page = getInstitutionalPage("trocas-e-devolucoes");

export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: "/trocas-e-devolucoes" } };

export default function Page() {
  return <InstitutionalPageView page={page} />;
}
