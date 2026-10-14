"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Customer: ask to return a delivered item. */
export function ReturnForm({ orderItemId }: { orderItemId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemId, reason: new FormData(e.currentTarget).get("reason") }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong");
    router.refresh();
  }

  if (!open) return <button className="btn-sm ghost" onClick={() => setOpen(true)}>Return item</button>;
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 6, marginTop: 6, minWidth: 220 }}>
      <textarea name="reason" rows={3} required minLength={10} maxLength={500} placeholder="Why are you returning it? (10+ characters)" />
      {error && <span style={{ color: "var(--red)", fontSize: 12 }}>{error}</span>}
      <div className="row-actions">
        <button className="btn-sm" disabled={busy} type="submit">{busy ? "Sending…" : "Send request"}</button>
        <button className="btn-sm ghost" type="button" onClick={() => setOpen(false)}>Close</button>
      </div>
    </form>
  );
}

/** Seller / admin: decide on a return, and (admin) mark it refunded. */
export function ReturnActions({ id, status, isAdmin }: { id: string; status: string; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "approve" | "reject" | "refund") {
    let note: string | undefined;
    if (action === "refund") {
      if (!confirm("Confirm the customer has been refunded? (For card orders, refund them in the PayHere dashboard first.)")) return;
    } else {
      const n = window.prompt(action === "approve" ? "Message to the customer (optional), e.g. how to send the item back:" : "Why is the return rejected? (the customer will see this)");
      if (n === null) return;
      note = n.trim() || undefined;
      if (action === "reject" && !note) return setError("Please give a reason");
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/returns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Failed");
    router.refresh();
  }

  return (
    <div className="row-actions">
      {status === "REQUESTED" && (
        <>
          <button className="btn-sm" disabled={busy} onClick={() => act("approve")}>Approve</button>
          <button className="btn-sm danger" disabled={busy} onClick={() => act("reject")}>Reject</button>
        </>
      )}
      {status === "APPROVED" && isAdmin && <button className="btn-sm" disabled={busy} onClick={() => act("refund")}>Mark refunded</button>}
      {status === "APPROVED" && !isAdmin && <span style={{ color: "var(--muted)", fontSize: 12 }}>Waiting for the refund</span>}
      {error && <span style={{ color: "var(--red)", fontSize: 12 }}>{error}</span>}
    </div>
  );
}
