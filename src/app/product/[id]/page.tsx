import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { visible } from "@/lib/visible";
import { discountPct, money } from "@/lib/format";
import Gallery from "@/components/Gallery";
import BuyBox from "@/components/BuyBox";
import ProductCard from "@/components/ProductCard";
import WishlistButton from "@/components/WishlistButton";
import { AskForm, DeleteQuestionButton } from "@/components/QuestionForms";

export const dynamic = "force-dynamic";

/** "Mary Jane Smith" -> "Mary S." so reviews don't expose full names. */
function maskName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const p = await db.product.findUnique({
    where: { id: params.id },
    include: { category: true, seller: true, variants: { orderBy: { sortOrder: "asc" } } },
  });
  if (!p || !p.active || !p.seller.approved) notFound();

  const [related, reviews] = await Promise.all([
    db.product.findMany({
      where: { categoryId: p.categoryId, ...visible, NOT: { id: p.id } },
      take: 6,
      orderBy: { sold: "desc" },
    }),
    db.review.findMany({
      where: { productId: p.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { name: true } } },
    }),
  ]);
  const off = discountPct(p.price, p.originalPrice);

  const perKg = p.seller.shippingPerKg > 0 && p.weightGrams > 0 ? ` + ${money(p.seller.shippingPerKg)} per extra kg` : "";
  const shipText =
    p.seller.shippingFee === 0 && !perKg
      ? "Free shipping"
      : `Shipping ${money(p.seller.shippingFee)}${perKg}${p.seller.freeShippingOver ? ` · free over ${money(p.seller.freeShippingOver)}` : ""}`;

  const user = await getUser();
  // Everyone sees answered questions; the asker also sees their own pending ones.
  const questions = await db.question.findMany({
    where: { productId: p.id, OR: [{ answer: { not: null } }, ...(user ? [{ userId: user.id }] : [])] },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: { name: true } } },
  });
  const wished = user
    ? !!(await db.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId: p.id } } }))
    : false;

  return (
    <>
      <p style={{ margin: "14px 0", color: "var(--muted)" }}>
        <Link href="/">Home</Link> › <Link href={`/category/${p.category.slug}`}>{p.category.name}</Link> › {p.title}
      </p>

      <section className="section">
        <div className="detail">
          <Gallery images={p.images} alt={p.title} />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <h1>{p.title}</h1>
              <WishlistButton productId={p.id} initial={wished} loggedIn={!!user} />
            </div>
            <p style={{ marginTop: 8, color: "var(--muted)" }}>
              <span className="stars">★ {p.rating.toFixed(1)}</span> · {p.ratingCount.toLocaleString()} ratings · {p.sold.toLocaleString()} sold
            </p>
            <div className="pricebox">
              <span className="price">{money(p.price)}</span>
              {off > 0 && p.originalPrice && (
                <span style={{ marginLeft: 12 }}>
                  <span className="old">{money(p.originalPrice)}</span> <span className="disc">-{off}%</span>
                </span>
              )}
            </div>
            <BuyBox id={p.id} title={p.title} price={p.price} image={p.images[0]} stock={p.stock} variants={p.variants.map((v) => ({ id: v.id, name: v.name, stock: v.stock }))} />
            <p style={{ marginTop: 22, lineHeight: 1.6 }}>{p.description}</p>
            <p style={{ marginTop: 14, color: "var(--muted)" }}>
              🚚 {shipText} · 3–5 days · 💵 Cash on delivery · ↩️ 7-day returns
            </p>
          </div>
        </div>
        <div className="sellerbox">
          <div>
            <Link href={`/shop/${p.seller.slug}`}><strong>{p.seller.shopName}</strong></Link>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>Seller rating ★ {p.seller.rating.toFixed(1)}</div>
          </div>
          <Link href={`/shop/${p.seller.slug}`} className="btn-ghost">Visit shop</Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Ratings &amp; Reviews</h2>
          <span style={{ color: "var(--muted)" }}>
            <span className="stars">★ {p.rating.toFixed(1)}</span> · {p.ratingCount.toLocaleString()} ratings
          </span>
        </div>
        {reviews.length === 0 ? (
          <div className="empty">No reviews yet. Buyers can review after delivery.</div>
        ) : (
          reviews.map((r) => (
            <div className="pad order-card" key={r.id}>
              <span className="stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              <p style={{ margin: "6px 0", lineHeight: 1.5 }}>{r.comment}</p>
              <small style={{ color: "var(--muted)" }}>
                {maskName(r.user.name)} · {r.createdAt.toLocaleDateString("en-GB")} · ✔ Verified purchase
              </small>
            </div>
          ))
        )}
      </section>

      <section className="section">
        <div className="section-head"><h2>Questions &amp; Answers</h2></div>
        {questions.length === 0 && <div className="empty">No questions yet. Ask the seller below.</div>}
        {questions.map((q) => (
          <div className="pad order-card" key={q.id}>
            <p><strong>Q:</strong> {q.text}</p>
            {q.answer ? (
              <p style={{ marginTop: 6 }}><strong>A:</strong> {q.answer} <small style={{ color: "var(--muted)" }}>· {p.seller.shopName}</small></p>
            ) : (
              <p style={{ marginTop: 6, color: "var(--muted)" }}>Waiting for the seller&apos;s answer (only you can see this).</p>
            )}
            <small style={{ color: "var(--muted)" }}>{maskName(q.user.name)} · {q.createdAt.toLocaleDateString("en-GB")}</small>
            {user && (user.role === "ADMIN" || (q.userId === user.id && !q.answer)) && (
              <span style={{ marginLeft: 8 }}><DeleteQuestionButton id={q.id} label={q.answer ? "Delete" : "Withdraw"} /></span>
            )}
          </div>
        ))}
        <AskForm productId={p.id} loggedIn={!!user} />
      </section>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>More from {p.category.name}</h2></div>
          <div className="grid">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </>
  );
}
