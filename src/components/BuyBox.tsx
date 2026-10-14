"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/cart";

type Variant = { id: string; name: string; stock: number };

export default function BuyBox({
  id,
  title,
  price,
  image,
  stock,
  variants = [],
}: {
  id: string;
  title: string;
  price: number;
  image: string;
  stock: number;
  variants?: Variant[];
}) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [variantId, setVariantId] = useState("");
  const [pickError, setPickError] = useState(false);
  const router = useRouter();

  const hasVariants = variants.length > 0;
  const chosen = variants.find((v) => v.id === variantId);
  // With variants, the stock that counts is the chosen variant's.
  const available = hasVariants ? (chosen?.stock ?? 0) : stock;
  const soldOut = stock <= 0;

  function pick(v: Variant) {
    setVariantId(v.id);
    setPickError(false);
    setQty((q) => Math.min(Math.max(1, q), v.stock || 1));
  }

  // Returns false (and asks the shopper to choose) when a variant is required but missing.
  function add() {
    if (hasVariants && !chosen) {
      setPickError(true);
      return false;
    }
    addToCart({ id, title, price, image, ...(chosen ? { variantId: chosen.id, variantName: chosen.name } : {}) }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    return true;
  }

  return (
    <>
      {hasVariants && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: "var(--muted)", marginBottom: 6 }}>Choose an option</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock <= 0}
                aria-pressed={v.id === variantId}
                onClick={() => pick(v)}
                className={v.id === variantId ? "btn-primary" : "btn-ghost"}
                style={{ padding: "6px 14px", opacity: v.stock <= 0 ? 0.45 : 1, textDecoration: v.stock <= 0 ? "line-through" : "none" }}
              >
                {v.name}
              </button>
            ))}
          </div>
          {pickError && <p style={{ color: "var(--red)", marginTop: 6 }}>Please choose an option first.</p>}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ color: "var(--muted)" }}>Quantity</span>
        <div className="qty">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => Math.min(available || 1, q + 1))}>+</button>
        </div>
        <span style={{ color: "var(--muted)" }}>
          {soldOut ? "Out of stock" : hasVariants && !chosen ? `${stock} available in total` : `${available} available`}
        </span>
      </div>
      <div className="actions">
        <button
          className="btn-primary"
          disabled={soldOut}
          onClick={() => {
            if (add()) router.push("/checkout");
          }}
        >
          Buy Now
        </button>
        <button className="btn-ghost" disabled={soldOut} onClick={add}>
          {added ? "Added ✓" : "Add to Cart"}
        </button>
      </div>
    </>
  );
}
