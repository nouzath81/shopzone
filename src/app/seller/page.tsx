import Link from "next/link";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth";
import { money } from "@/lib/format";
import { dailySales, parseDays } from "@/lib/sales";
import RangeFilter from "@/components/RangeFilter";
import SalesChart from "@/components/SalesChart";

export const dynamic = "force-dynamic";

export default async function SellerHome({ searchParams }: { searchParams: { days?: string } }) {
  const { seller } = await requireSeller();
  const days = parseDays(searchParams.days);
  const points = await dailySales(days, seller.id);

  const [products, items] = await Promise.all([
    db.product.findMany({ where: { sellerId: seller.id }, select: { id: true, title: true, stock: true, active: true, images: true } }),
    db.orderItem.findMany({
      where: { product: { sellerId: seller.id } },
      select: { quantity: true, price: true, status: true },
    }),
  ]);

  const live = items.filter((i) => i.status !== "CANCELLED");
  const unitsSold = live.reduce((n, i) => n + i.quantity, 0);
  const revenue = items.filter((i) => i.status === "DELIVERED").reduce((n, i) => n + i.quantity * i.price, 0);
  const pending = items.filter((i) => i.status === "PENDING").length;
  const lowStock = products.filter((p) => p.active && p.stock <= 5);

  return (
    <>
      {!seller.approved && (
        <section className="section" style={{ marginTop: 0, borderLeft: "4px solid var(--brand)" }}>
          <div className="pad">
            🕒 <strong>Your shop is waiting for admin approval.</strong> You can add products now, but customers will only
            see them after you are approved.
          </div>
        </section>
      )}
      <RangeFilter basePath="/seller" days={days} />
      <SalesChart title="Your sales" points={points} days={days} />

      <div className="stats">
        <div className="stat"><small>Active products</small><b>{products.filter((p) => p.active).length}</b></div>
        <div className="stat"><small>Units sold</small><b>{unitsSold.toLocaleString()}</b></div>
        <div className="stat"><small>Revenue (delivered)</small><b>{money(revenue)}</b></div>
        <div className="stat"><small>Orders to ship</small><b>{pending}</b></div>
      </div>

      {pending > 0 && (
        <section className="section" style={{ marginTop: 0 }}>
          <div className="pad">
            🚚 You have <strong>{pending}</strong> order{pending > 1 ? "s" : ""} waiting to ship.{" "}
            <Link href="/seller/orders" style={{ color: "var(--brand)" }}>View orders</Link>
          </div>
        </section>
      )}

      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2>Low stock</h2></div>
        {lowStock.length === 0 ? (
          <div className="pad" style={{ color: "var(--muted)" }}>All your products have healthy stock.</div>
        ) : (
          <div className="table-wrap">
            <table className="t">
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td><img src={p.images[0]} alt="" /></td>
                    <td>{p.title}</td>
                    <td><span className={`badge ${p.stock === 0 ? "CANCELLED" : "PENDING"}`}>{p.stock === 0 ? "Sold out" : `${p.stock} left`}</span></td>
                    <td><Link href={`/seller/products/${p.id}/edit`} className="btn-sm ghost">Restock</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
