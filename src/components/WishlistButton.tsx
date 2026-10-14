"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WishlistButton({
  productId,
  initial,
  loggedIn,
}: {
  productId: string;
  initial: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) return router.push(`/login?next=${encodeURIComponent(`/product/${productId}`)}`);
    const next = !on;
    setOn(next); // update the heart straight away
    setBusy(true);
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, on: next }),
    });
    setBusy(false);
    if (!res.ok) setOn(!next); // put it back if the server said no
    else router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      title={on ? "Remove from wishlist" : "Add to wishlist"}
      style={{ background: "none", fontSize: 26, color: on ? "var(--red)" : "#bbb", lineHeight: 1 }}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
