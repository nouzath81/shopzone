import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AddCategoryForm } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  await requireAdmin();
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });

  return (
    <>
      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2>Add a category</h2></div>
        <AddCategoryForm />
      </section>
      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2>Categories ({categories.length})</h2></div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Icon</th><th>Name</th><th>URL</th><th>Products</th></tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}><td>{c.icon}</td><td>{c.name}</td><td>/category/{c.slug}</td><td>{c._count.products}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
