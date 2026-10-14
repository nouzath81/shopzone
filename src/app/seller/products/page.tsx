import Link from "next/link";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth";
import { money } from "@/lib/format";
import DeleteProductButton from "@/components/DeleteProductButton";

export const dynamic = "force-dynamic";

export default async function SellerProducts() {
  const { seller } = await requireSeller();
  const products = await db.product.findMany({
    where: { sellerId: seller.id },
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="section-head">
        <h2>My Products ({products.length})</h2>
        <Link href="/seller/products/new" className="btn-sm">+ Add product</Link>
      </div>
      {products.length === 0 ? (
        <div className="empty">No products yet. Add your first one!</div>
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Sold</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td><img src={p.images[0]} alt="" /></td>
                  <td style={{ maxWidth: 280 }}>{p.title}</td>
                  <td>{p.category.name}</td>
                  <td>{money(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>{p.sold}</td>
                  <td><span className={`badge ${p.active ? "DELIVERED" : "off"}`}>{p.active ? "Live" : "Hidden"}</span></td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/seller/products/${p.id}/edit`} className="btn-sm ghost">Edit</Link>
                      {p.active && <Link href={`/product/${p.id}`} className="btn-sm ghost">View</Link>}
                      {p.active && <DeleteProductButton id={p.id} />}
                    </div>
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
