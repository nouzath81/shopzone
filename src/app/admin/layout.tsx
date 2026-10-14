import DashShell from "@/components/DashNav";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <DashShell
      title="Admin"
      links={[
        { href: "/admin", label: "📊 Overview" },
        { href: "/admin/orders", label: "🧾 Orders" },
        { href: "/admin/returns", label: "↩️ Returns" },
        { href: "/admin/payouts", label: "💰 Payouts" },
        { href: "/admin/products", label: "📦 Products" },
        { href: "/admin/users", label: "👥 Users & Sellers" },
        { href: "/admin/categories", label: "🗂️ Categories" },
        { href: "/admin/vouchers", label: "🎟️ Vouchers" },
      ]}
    >
      {children}
    </DashShell>
  );
}
