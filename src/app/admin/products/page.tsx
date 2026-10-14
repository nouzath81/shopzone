import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { money } from "@/lib/format";
import { ToggleProductButton } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  await requireAdmin();
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { seller: true, category: true },
  });

  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="section-head"><h2>Products (latest 200)</h2></div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th></th><th>Product</th><th>Seller</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><img src={p.images[0]} alt="" /></td>
                <td style={{ maxWidth: 240 }}>{p.active ? <Link href={`/product/${p.id}`}>{p.title}</Link> : p.title}</td>
                <td>{p.seller.shopName}</td>
                <td>{p.category.name}</td>
                <td>{money(p.price)}</td>
                <td>{p.stock}</td>
                <td><span className={`badge ${p.active ? "DELIVERED" : "off"}`}>{p.active ? "Live" : "Hidden"}</span></td>
                <td><ToggleProductButton id={p.id} active={p.active} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
