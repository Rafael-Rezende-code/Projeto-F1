import { CouponFormView } from "@/components/admin/coupon-form";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";

export default async function NovoCupom() {
  if (adminDisabled()) return null;
  await requireAdmin();
  return (
    <div>
      <h1 className="mb-6 text-4xl tracking-[-0.05em]">Novo cupom</h1>
      <CouponFormView />
    </div>
  );
}
