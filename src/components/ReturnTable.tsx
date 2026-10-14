import { money } from "@/lib/format";
import { ReturnActions } from "@/components/ReturnForms";

type Row = {
  id: string;
  status: string;
  reason: string;
  note: string | null;
  refundAmount: number;
  createdAt: Date;
  user: { name: string };
  orderItem: { quantity: number; orderId: string; variantName?: string | null; product: { title: string; images: string[]; seller: { shopName: string } } };
};

export default function ReturnTable({ rows, isAdmin }: { rows: Row[]; isAdmin: boolean }) {
  if (rows.length === 0) return <div className="empty">No return requests.</div>;
  return (
    <div className="table-wrap">
      <table className="t">
        <thead><tr><th></th><th>Item</th>{isAdmin && <th>Seller</th>}<th>Customer &amp; reason</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={r.orderItem.product.images[0]} alt="" /></td>
              <td style={{ maxWidth: 200 }}>
                {r.orderItem.product.title}{r.orderItem.variantName ? ` (${r.orderItem.variantName})` : ""} × {r.orderItem.quantity}
                <div style={{ color: "var(--muted)", fontSize: 11 }}>#{r.orderItem.orderId.slice(-8).toUpperCase()} · {r.createdAt.toLocaleDateString("en-GB")}</div>
              </td>
              {isAdmin && <td>{r.orderItem.product.seller.shopName}</td>}
              <td style={{ fontSize: 12, minWidth: 200, maxWidth: 300 }}>
                <strong>{r.user.name}</strong>: {r.reason}
                {r.note && <div style={{ color: "var(--muted)", marginTop: 4 }}>Reply: {r.note}</div>}
              </td>
              <td>
                <span className={`badge ${r.status === "REJECTED" ? "CANCELLED" : r.status === "REFUNDED" ? "DELIVERED" : "PENDING"}`}>{r.status}</span>
                {r.status !== "REQUESTED" && r.status !== "REJECTED" && <div style={{ fontSize: 12, marginTop: 4 }}>Refund {money(r.refundAmount)}</div>}
              </td>
              <td><ReturnActions id={r.id} status={r.status} isAdmin={isAdmin} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
