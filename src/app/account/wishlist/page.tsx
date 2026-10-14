import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { visible } from "@/lib/visible";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function Wishlist() {
  const user = await requireUser("/account/wishlist");
  // Products that were hidden or removed since being saved simply don't show up.
  const saved = await db.wishlistItem.findMany({
    where: { userId: user.id, product: visible },
    orderBy: { createdAt: "desc" },
    include: { product: true },
  });

  return (
    <section className="section">
      <div className="section-head"><h2>My Wishlist ({saved.length})</h2></div>
      {saved.length === 0 ? (
        <div className="empty">
          Nothing saved yet. Tap the ♡ on a product to keep it here.{" "}
          <Link href="/" style={{ color: "var(--brand)" }}>Browse products</Link>
        </div>
      ) : (
        <div className="grid">
          {saved.map((w) => <ProductCard key={w.id} p={w.product} />)}
        </div>
      )}
    </section>
  );
}
