"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Shopper: ask a question on the product page. */
export function AskForm({ productId, loggedIn }: { productId: string; loggedIn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  if (!loggedIn) {
    return <div className="pad"><Link href={`/login?next=/product/${productId}`} style={{ color: "var(--brand)" }}>Log in</Link> to ask the seller a question.</div>;
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    setMsg("");
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, text: new FormData(form).get("text") }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Something went wrong");
    form.reset();
    setMsg("Sent! It will appear here once the seller answers.");
    router.refresh();
  }

  return (
    <form className="pad" onSubmit={submit} style={{ display: "grid", gap: 8 }}>
      <textarea name="text" rows={2} required minLength={5} maxLength={300} placeholder="Ask the seller about this product (size, warranty, delivery…)" />
      {error && <span style={{ color: "var(--red)" }}>{error}</span>}
      {msg && <span className="ok">{msg}</span>}
      <div><button className="btn-primary" disabled={busy} type="submit">{busy ? "Sending…" : "Ask a question"}</button></div>
    </form>
  );
}

/** Seller / admin: write or edit an answer. Asker / admin: delete. */
export function AnswerForm({ id, current }: { id: string; current: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: new FormData(e.currentTarget).get("answer") }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Failed");
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 6 }}>
      <textarea name="answer" rows={2} required minLength={2} maxLength={500} defaultValue={current ?? ""} placeholder="Your answer" />
      {error && <span style={{ color: "var(--red)", fontSize: 12 }}>{error}</span>}
      <div><button className="btn-sm" disabled={busy} type="submit">{current ? "Update answer" : "Send answer"}</button></div>
    </form>
  );
}

export function DeleteQuestionButton({ id, label = "Delete" }: { id: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!confirm("Delete this question?")) return;
    setBusy(true);
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }
  return <button className="btn-sm danger" disabled={busy} onClick={go} type="button">{label}</button>;
}
