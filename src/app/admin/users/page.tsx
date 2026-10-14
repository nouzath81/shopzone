import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ApproveSellerButton } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

export default async function AdminUsers() {
  await requireAdmin();
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { seller: { include: { _count: { select: { products: true } } } }, _count: { select: { orders: true } } },
  });

  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="section-head"><h2>Users & sellers ({users.length})</h2></div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Shop</th><th>Products</th><th>Orders</th><th>Joined</th><th>Shop status</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className="badge">{u.role}</span></td>
                <td>{u.seller?.shopName ?? "—"}</td>
                <td>{u.seller?._count.products ?? "—"}</td>
                <td>{u._count.orders}</td>
                <td>{u.createdAt.toLocaleDateString("en-GB")}</td>
                <td>
                  {u.seller ? (
                    <div className="row-actions">
                      <span className={`badge ${u.seller.approved ? "DELIVERED" : "PENDING"}`}>{u.seller.approved ? "Approved" : "Waiting"}</span>
                      <ApproveSellerButton id={u.seller.id} approved={u.seller.approved} />
                    </div>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
