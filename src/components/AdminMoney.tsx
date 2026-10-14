"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PayoutForm({ sellerId, max }: { sellerId: string; max: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!confirm(`Record a payout of ${f.get("amount")} to this seller?`)) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId, amount: f.get("amount"), note: f.get("note") }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Failed");
    router.refresh();
  }

  if (max <= 0) return <span style={{ color: "var(--muted)", fontSize: 12 }}>Nothing to pay</span>;
  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <input name="amount" type="number" min={0.01} max={max / 100} step="0.01" required placeholder="Amount" defaultValue={max / 100} style={{ width: 110 }} />
      <input name="note" maxLength={200} placeholder="Bank ref (optional)" style={{ width: 140 }} />
      <button className="btn-sm" disabled={busy} type="submit">Record payout</button>
      {error && <span style={{ color: "var(--red)", fontSize: 12 }}>{error}</span>}
    </form>
  );
}

export function CommissionForm({ sellerId, pct }: { sellerId: string; pct: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/commission", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId, commissionPct: Number(new FormData(e.currentTarget).get("pct")) }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Failed");
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <input name="pct" type="number" min={0} max={50} step={1} required defaultValue={pct} style={{ width: 56 }} aria-label="Commission percent" />%
      <button className="btn-sm ghost" disabled={busy} type="submit">Set</button>
      {error && <span style={{ color: "var(--red)", fontSize: 12 }}>{error}</span>}
    </form>
  );
}

export function ExpireOrdersButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function go() {
    if (!confirm("Cancel all card orders that were not paid within 24 hours? Stock goes back on sale.")) return;
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/expire-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hours: 24 }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? `Cancelled ${data.cancelled} unpaid order(s).` : data.error ?? "Failed");
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button className="btn-sm ghost" disabled={busy} onClick={go}>{busy ? "Working…" : "Cancel unpaid card orders (24h+)"}</button>
      {msg && <span style={{ fontSize: 12 }}>{msg}</span>}
    </span>
  );
}
