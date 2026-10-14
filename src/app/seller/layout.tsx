import DashShell from "@/components/DashNav";
import { requireSeller } from "@/lib/auth";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { seller } = await requireSeller();
  return (
    <DashShell
      title={seller.shopName}
      links={[
        { href: "/seller", label: "📊 Overview" },
        { href: "/seller/products", label: "📦 My Products" },
        { href: "/seller/products/new", label: "➕ Add Product" },
        { href: "/seller/orders", label: "🧾 Orders" },
        { href: "/seller/questions", label: "💬 Questions" },
        { href: "/seller/returns", label: "↩️ Returns" },
        { href: "/seller/earnings", label: "💰 Earnings" },
        { href: "/seller/profile", label: "🏪 Shop profile" },
      ]}
    >
      {children}
    </DashShell>
  );
}
