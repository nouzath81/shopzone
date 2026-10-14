import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { visible } from "@/lib/visible";
import Listing from "@/components/Listing";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { sort?: string; min?: string; max?: string };
}) {
  const seller = await db.seller.findUnique({ where: { slug: params.slug } });
  // Shops waiting for approval (or suspended) are not public.
  if (!seller || !seller.approved) notFound();

  const [count, sold] = await Promise.all([
    db.product.count({ where: { sellerId: seller.id, ...visible } }),
    db.product.aggregate({ where: { sellerId: seller.id, ...visible }, _sum: { sold: true } }),
  ]);

  return (
    <>
      <section className="section">
        <div className="pad" style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{ width: 72, height: 72, borderRadius: 36, background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontSize: 30, fontWeight: 700 }}
            aria-hidden
          >
            {seller.shopName.trim()[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ fontSize: 22 }}>{seller.shopName}</h1>
            <p style={{ color: "var(--muted)", marginTop: 4 }}>
              <span className="stars">★ {seller.rating.toFixed(1)}</span> · {count} products · {(sold._sum.sold ?? 0).toLocaleString()} sold · Joined{" "}
              {seller.createdAt.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
            </p>
            {seller.about && <p style={{ marginTop: 8, lineHeight: 1.5, whiteSpace: "pre-line" }}>{seller.about}</p>}
          </div>
        </div>
      </section>

      <Listing
        basePath={`/shop/${seller.slug}`}
        where={{ sellerId: seller.id }}
        sort={searchParams.sort}
        min={searchParams.min}
        max={searchParams.max}
        title="All products"
      />
    </>
  );
}
