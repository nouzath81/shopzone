import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import ReturnTable from "@/components/ReturnTable";

export const dynamic = "force-dynamic";

export default async function AdminReturns() {
  await requireAdmin();
  const rows = await db.returnRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true } }, orderItem: { include: { product: { include: { seller: true } } } } },
  });
  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="section-head"><h2>Returns &amp; refunds ({rows.length})</h2></div>
      <div className="pad" style={{ color: "var(--muted)", fontSize: 13 }}>
        After a return is approved, send the money back (card orders: refund in the PayHere dashboard; cash orders: the seller returns the cash), then press &ldquo;Mark refunded&rdquo;. A refunded item no longer counts towards the seller&apos;s earnings. Admins can also approve or reject.
      </div>
      <ReturnTable rows={rows} isAdmin />
    </section>
  );
}
