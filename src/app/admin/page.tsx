import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { money } from "@/lib/format";
import { dailySales, parseDays } from "@/lib/sales";
import RangeFilter from "@/components/RangeFilter";
import SalesChart from "@/components/SalesChart";

export const dynamic = "force-dynamic";

export default async function AdminHome({ searchParams }: { searchParams: { days?: string } }) {
  await requireAdmin();
  const days = parseDays(searchParams.days);
  const points = await dailySales(days);

  const [customers, sellers, waiting, products, orders, items, recent] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.seller.count(),
    db.seller.count({ where: { approved: false } }),
    db.product.count({ where: { active: true } }),
    db.order.count(),
    db.orderItem.findMany({ select: { quantity: true, price: true, status: true } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: true, items: true } }),
  ]);

  const gmv = items.filter((i) => i.status !== "CANCELLED").reduce((n, i) => n + i.quantity * i.price, 0);
  const toShip = items.filter((i) => i.status === "PENDING").length;

  return (
    <>
      <RangeFilter basePath="/admin" days={days} />
      <SalesChart title="Marketplace sales" points={points} days={days} />

      <div className="stats">
        <div className="stat"><small>Sales (excl. cancelled)</small><b>{money(gmv)}</b></div>
        <div className="stat"><small>Orders</small><b>{orders}</b></div>
        <div className="stat"><small>Items waiting to ship</small><b>{toShip}</b></div>
        <div className="stat"><small>Live products</small><b>{products}</b></div>
        <div className="stat"><small>Customers</small><b>{customers}</b></div>
        <div className="stat"><small>Sellers</small><b>{sellers}</b></div>
        <div className="stat"><small>Sellers awaiting approval</small><b>{waiting}</b></div>
      </div>

      {waiting > 0 && (
        <section className="section" style={{ marginTop: 0 }}>
          <div className="pad">
            🕒 <strong>{waiting}</strong> seller{waiting > 1 ? "s are" : " is"} waiting for approval.{" "}
            <Link href="/admin/users" style={{ color: "var(--brand)" }}>Review now</Link>
          </div>
        </section>
      )}

      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2>Latest orders</h2><Link href="/admin/orders">See all</Link></div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Date</th></tr></thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/order/${o.id}`} style={{ color: "var(--brand)" }}>{o.id.slice(-8).toUpperCase()}</Link></td>
                  <td>{o.user.name}</td>
                  <td>{o.items.length}</td>
                  <td>{money(o.total)}</td>
                  <td>{o.createdAt.toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td colSpan={5} style={{ color: "var(--muted)" }}>No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
