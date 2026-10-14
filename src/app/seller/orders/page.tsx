import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth";
import { money } from "@/lib/format";
import StatusButtons from "@/components/StatusButtons";
import ExportLinks from "@/components/ExportLinks";

export const dynamic = "force-dynamic";

export default async function SellerOrders() {
  const { seller } = await requireSeller();
  const items = await db.orderItem.findMany({
    where: { product: { sellerId: seller.id } },
    orderBy: { order: { createdAt: "desc" } },
    take: 200,
    include: { product: true, order: true },
  });

  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="section-head"><h2>Orders ({items.length})</h2><ExportLinks /></div>
      {items.length === 0 ? (
        <div className="empty">No orders yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr><th></th><th>Item</th><th>Qty</th><th>Total</th><th>Ship to</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td><img src={i.product.images[0]} alt="" /></td>
                  <td style={{ maxWidth: 220 }}>
                    {i.product.title}{i.variantName ? ` (${i.variantName})` : ""}
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>#{i.orderId.slice(-8).toUpperCase()} · {i.order.createdAt.toLocaleDateString("en-GB")}</div>
                  </td>
                  <td>{i.quantity}</td>
                  <td>{money(i.price * i.quantity)}</td>
                  <td style={{ fontSize: 12, minWidth: 180 }}>
                    <strong>{i.order.name}</strong> · {i.order.phone}<br />
                    {i.order.address}, {i.order.city}<br />
                    <span style={{ color: "var(--muted)" }}>{i.order.payment === "COD" ? "Collect cash on delivery" : i.order.paid ? "Paid online ✓" : "Card: not paid yet"}</span>
                  </td>
                  <td><span className={`badge ${i.status}`}>{i.status}</span></td>
                  <td>
                    {i.order.payment === "CARD" && !i.order.paid && i.status === "PENDING" ? (
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>Awaiting payment. Do not ship yet.</span>
                    ) : (
                      <StatusButtons id={i.id} status={i.status} who="SELLER" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
