"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReviewForm({ orderItemId }: { orderItemId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setError("Choose a star rating");
    setBusy(true);
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemId, rating, comment }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not save your review");
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn-sm ghost" onClick={() => setOpen(true)}>
        ★ Write a review
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 260 }}>
      <div aria-label="Rating" style={{ fontSize: 26, color: "#ffb400", cursor: "pointer" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} onClick={() => setRating(n)} role="button" aria-label={`${n} stars`}>
            {n <= rating ? "★" : "☆"}
          </span>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        required
        minLength={3}
        maxLength={1000}
        placeholder="How was the product?"
        style={{ padding: 8, border: "1px solid var(--line)", borderRadius: 3 }}
      />
      {error && <span style={{ color: "var(--red)", fontSize: 12 }}>{error}</span>}
      <div className="row-actions">
        <button className="btn-sm" disabled={busy} type="submit">{busy ? "Saving…" : "Submit review"}</button>
        <button className="btn-sm ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
