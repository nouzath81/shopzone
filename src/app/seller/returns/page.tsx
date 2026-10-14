import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth";
import ReturnTable from "@/components/ReturnTable";

export const dynamic = "force-dynamic";

export default async function SellerReturns() {
  const { seller } = await requireSeller();
  const rows = await db.returnRequest.findMany({
    where: { orderItem: { product: { sellerId: seller.id } } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true } }, orderItem: { include: { product: { include: { seller: true } } } } },
  });
  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="section-head"><h2>Return requests ({rows.length})</h2></div>
      <div className="pad" style={{ color: "var(--muted)", fontSize: 13 }}>
        Customers can ask to return a delivered item within 7 days. Approve or reject each request; once you approve, an admin sends the money back to the customer.
      </div>
      <ReturnTable rows={rows} isAdmin={false} />
    </section>
  );
}
