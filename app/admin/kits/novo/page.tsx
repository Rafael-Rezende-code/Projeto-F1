import { KitFormView } from "@/components/admin/kit-form";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { kitOptions } from "../options";

export default async function NovoKit() {
  if (adminDisabled()) return null;
  await requireAdmin();
  return (
    <div>
      <h1 className="mb-6 text-4xl tracking-[-0.05em]">Novo kit</h1>
      <KitFormView {...await kitOptions()} />
    </div>
  );
}
