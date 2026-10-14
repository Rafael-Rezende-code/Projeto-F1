import type { Metadata } from "next";
import { InstitutionalPageView } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional";

const page = getInstitutionalPage("contato");

export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: "/contato" } };

export default function Page() {
  return <InstitutionalPageView page={page} />;
}
