import Link from "next/link";
import { requireSeller } from "@/lib/auth";
import { parseZones } from "@/lib/shipping";
import ShopProfileForm from "@/components/ShopProfileForm";

export const dynamic = "force-dynamic";

export default async function SellerProfile() {
  const { seller } = await requireSeller();
  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="section-head">
        <h2>Shop profile &amp; shipping</h2>
        {seller.approved ? (
          <Link href={`/shop/${seller.slug}`}>View my public shop →</Link>
        ) : (
          <span style={{ color: "var(--muted)" }}>Public after admin approval</span>
        )}
      </div>
      <ShopProfileForm
        shopName={seller.shopName}
        about={seller.about}
        shippingFee={seller.shippingFee}
        shippingPerKg={seller.shippingPerKg}
        freeShippingOver={seller.freeShippingOver}
        zones={parseZones(seller.shippingZones)}
      />
    </section>
  );
}
