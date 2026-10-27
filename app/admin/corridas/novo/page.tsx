import { RaceFormView } from "@/components/admin/race-form";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { collections } from "@/lib/content/collections";

export default async function NovaCorrida() {
  if (adminDisabled()) return null;
  await requireAdmin();
  return (
    <div>
      <h1 className="mb-6 text-4xl tracking-[-0.05em]">Nova corrida</h1>
      <RaceFormView collections={collections.map((item) => ({ slug: item.slug, title: item.title }))} />
    </div>
  );
}
