import Link from "next/link";
import { db } from "@/lib/db";
import { visible } from "@/lib/visible";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [categories, flash, forYou] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({ where: { flashSale: true, ...visible }, take: 6, orderBy: { sold: "desc" } }),
    db.product.findMany({ where: visible, take: 24, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <div className="hero">
        <nav className="cat-menu">
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`}>
              <span>{c.icon}</span> {c.name}
            </Link>
          ))}
        </nav>
        <div className="banner">
          <h1>Mega Sale<br />Up to 60% Off</h1>
          <p>Free shipping on your first order · Cash on delivery available</p>
          <Link href="/search?q=" className="btn">Shop Now</Link>
        </div>
      </div>

      <section className="section">
        <div className="section-head"><h2>Categories</h2></div>
        <div className="cat-tiles">
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className="cat-tile">
              <div className="ico">{c.icon}</div>
              <span>{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {flash.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 style={{ color: "var(--brand)" }}>⚡ Flash Sale</h2>
          </div>
          <div className="grid">
            {flash.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head"><h2>Just For You</h2></div>
        <div className="grid">
          {forYou.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>
    </>
  );
}
