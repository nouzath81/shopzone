import Link from "next/link";
import { db } from "@/lib/db";
import { visible } from "@/lib/visible";
import ProductCard from "@/components/ProductCard";
import type { Prisma } from "@prisma/client";

type Params = {
  basePath: string; // e.g. /category/electronics or /search
  where: Prisma.ProductWhereInput;
  sort?: string;
  min?: string;
  max?: string;
  q?: string;
  title: string;
};

const SORTS: Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }> = {
  popular: { label: "Popular", orderBy: { sold: "desc" } },
  newest: { label: "Newest", orderBy: { createdAt: "desc" } },
  low: { label: "Price: Low to High", orderBy: { price: "asc" } },
  high: { label: "Price: High to Low", orderBy: { price: "desc" } },
};

export default async function Listing({ basePath, where, sort = "popular", min, max, q, title }: Params) {
  const priceFilter: Prisma.IntFilter = {};
  if (min && !isNaN(Number(min))) priceFilter.gte = Math.round(Number(min) * 100);
  if (max && !isNaN(Number(max))) priceFilter.lte = Math.round(Number(max) * 100);

  const fullWhere: Prisma.ProductWhereInput = {
    ...where,
    ...visible,
    ...(Object.keys(priceFilter).length ? { price: priceFilter } : {}),
  };
  const key = SORTS[sort] ? sort : "popular";

  const [products, categories] = await Promise.all([
    db.product.findMany({ where: fullWhere, orderBy: SORTS[key].orderBy, take: 60 }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (min) p.set("min", min);
    if (max) p.set("max", max);
    p.set("sort", key);
    Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    return `${basePath}?${p.toString()}`;
  };

  return (
    <div className="listing">
      <aside className="filters">
        <h3>Categories</h3>
        {categories.map((c) => (
          <Link key={c.id} href={`/category/${c.slug}`}>{c.icon} {c.name}</Link>
        ))}
        <h3>Price</h3>
        <form action={basePath} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q && <input type="hidden" name="q" value={q} />}
          <input name="min" type="number" placeholder="Min" defaultValue={min} />
          <input name="max" type="number" placeholder="Max" defaultValue={max} />
          <input type="hidden" name="sort" value={key} />
          <button className="btn-primary" type="submit">Apply</button>
        </form>
      </aside>

      <div className="section" style={{ marginTop: 0 }}>
        <div className="section-head">
          <h2>{title}</h2>
          <span style={{ color: "var(--muted)" }}>{products.length} items</span>
        </div>
        <div className="sortbar">
          <span>Sort by:</span>
          {Object.entries(SORTS).map(([k, s]) => (
            <Link key={k} href={qs({ sort: k })} className={k === key ? "active" : ""}>{s.label}</Link>
          ))}
        </div>
        {products.length === 0 ? (
          <div className="empty">No products found.</div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
