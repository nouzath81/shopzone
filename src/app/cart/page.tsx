"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";

export default function CartPage() {
  const { lines, total, count, setQty, remove } = useCart();

  if (lines.length === 0) {
    return (
      <section className="section" style={{ marginTop: 16 }}>
        <div className="empty">
          <p style={{ fontSize: 18, marginBottom: 14 }}>Your cart is empty</p>
          <Link href="/" className="btn-primary" style={{ display: "inline-block" }}>Continue Shopping</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="two-col">
      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2>Shopping Cart ({count})</h2></div>
        {lines.map((l) => (
          <div className="line" key={l.key}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.image} alt={l.title} />
            <div>
              <Link href={`/product/${l.id}`}>{l.title}</Link>
              {l.variantName && <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>{l.variantName}</div>}
              <div style={{ marginTop: 6 }}>
                <button onClick={() => remove(l.key)} style={{ background: "none", color: "var(--red)" }}>Remove</button>
              </div>
            </div>
            <div className="qty">
              <button onClick={() => setQty(l.key, l.quantity - 1)}>−</button>
              <span>{l.quantity}</span>
              <button onClick={() => setQty(l.key, l.quantity + 1)}>+</button>
            </div>
            <div className="price">{money(l.price * l.quantity)}</div>
          </div>
        ))}
      </section>

      <aside className="summary">
        <h3>Order Summary</h3>
        <div className="row total"><span>Subtotal ({count} items)</span><span>{money(total)}</span></div>
        <div className="row"><span>Shipping</span><span style={{ color: "var(--muted)" }}>Calculated at checkout</span></div>
        <Link href="/checkout" className="btn-primary" style={{ textAlign: "center" }}>Proceed to Checkout</Link>
      </aside>
    </div>
  );
}
