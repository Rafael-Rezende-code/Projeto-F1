import { AdminSkeleton } from "@/components/skeletons";

// Esqueleto das páginas do painel (operação, fase 6): aparece enquanto o servidor consulta o banco.
export default function Loading() {
  return <AdminSkeleton />;
}
