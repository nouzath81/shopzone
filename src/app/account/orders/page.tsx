import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyOrders() {
  const user = await requireUser("/account/orders");
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });

  return (
    <section className="section">
      <div className="section-head"><h2>My Orders</h2></div>
      {orders.length === 0 ? (
        <div className="empty">
          You haven&apos;t ordered anything yet. <Link href="/" style={{ color: "var(--brand)" }}>Start shopping</Link>
        </div>
      ) : (
        orders.map((o) => (
          <div className="order-card" key={o.id}>
            <div className="sellerbox" style={{ borderTop: 0, background: "#fafafa" }}>
              <span>
                Order <Link href={`/order/${o.id}`} style={{ color: "var(--brand)" }}>{o.id.slice(-8).toUpperCase()}</Link>
                {" · "}{o.createdAt.toLocaleDateString("en-GB")}
              </span>
              <strong>{money(o.total)}</strong>
            </div>
            {o.items.map((i) => (
              <div className="line" key={i.id} style={{ gridTemplateColumns: "60px 1fr auto" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.product.images[0]} alt="" style={{ width: 60, height: 60 }} />
                <div>
                  {i.product.title} <span style={{ color: "var(--muted)" }}>× {i.quantity}</span>
                </div>
                <span className={`badge ${i.status}`}>{i.status}</span>
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}
