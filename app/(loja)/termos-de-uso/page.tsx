import type { Metadata } from "next";
import { InstitutionalPageView } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional";

const page = getInstitutionalPage("termos-de-uso");

export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: "/termos-de-uso" } };

export default function Page() {
  return <InstitutionalPageView page={page} />;
}
