import Link from "next/link";
import { RaceImport } from "@/components/admin/race-import";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";

const currentYear = () => new Date().getFullYear();

// Importar o calendário da temporada (loja extra, item 5): prévia antes de gravar.
export default async function ImportarCorridas() {
  if (adminDisabled()) return null;
  await requireAdmin();
  return (
    <div>
      <Link href="/admin/corridas" className="text-sm text-black/60 hover:underline">← Corridas</Link>
      <h1 className="mb-6 mt-3 text-4xl tracking-[-0.05em]">Importar calendário da temporada</h1>
      <RaceImport defaultSeason={currentYear()} />
    </div>
  );
}
