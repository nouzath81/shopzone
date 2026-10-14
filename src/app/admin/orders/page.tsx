import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { money } from "@/lib/format";
import StatusButtons from "@/components/StatusButtons";
import ExportLinks from "@/components/ExportLinks";
import { ExpireOrdersButton } from "@/components/AdminMoney";

export const dynamic = "force-dynamic";

export default async function AdminOrders() {
  await requireAdmin();
  const items = await db.orderItem.findMany({
    orderBy: { order: { createdAt: "desc" } },
    take: 200,
    include: { product: { include: { seller: true } }, order: { include: { user: true } } },
  });

  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="section-head"><h2>All order items (latest 200)</h2><ExportLinks /><ExpireOrdersButton /></div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Order</th><th>Item</th><th>Seller</th><th>Customer</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>#{i.orderId.slice(-8).toUpperCase()}<div style={{ color: "var(--muted)", fontSize: 11 }}>{i.order.createdAt.toLocaleDateString("en-GB")}</div></td>
                <td style={{ maxWidth: 220 }}>{i.product.title}{i.variantName ? ` (${i.variantName})` : ""} × {i.quantity}</td>
                <td>{i.product.seller.shopName}</td>
                <td>{i.order.user.name}<div style={{ color: "var(--muted)", fontSize: 11 }}>{i.order.phone}</div></td>
                <td>{money(i.price * i.quantity)}</td>
                <td><span className={`badge ${i.status}`}>{i.status}</span></td>
                <td><StatusButtons id={i.id} status={i.status} who="ADMIN" /></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} style={{ color: "var(--muted)" }}>No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
