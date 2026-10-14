"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteProductButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Remove this product? If it already has orders it will be hidden instead of deleted.")) return;
    setBusy(true);
    const res = await fetch(`/api/seller/products/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return alert("Could not remove the product");
    router.refresh();
  }

  return (
    <button className="btn-sm danger" disabled={busy} onClick={remove}>
      Remove
    </button>
  );
}
