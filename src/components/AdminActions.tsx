"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ToggleProductButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setBusy(false);
    if (!res.ok) return alert("Could not update the product");
    router.refresh();
  }

  return (
    <button className={`btn-sm ${active ? "danger" : ""}`} disabled={busy} onClick={toggle}>
      {active ? "Hide" : "Show"}
    </button>
  );
}

export function AddCategoryForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    const f = new FormData(form);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.get("name"), icon: f.get("icon") }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Failed");
    form.reset();
    router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={submit} style={{ gridTemplateColumns: "1fr 120px auto", alignItems: "end" }}>
      <label>Name<input name="name" required /></label>
      <label>Emoji icon<input name="icon" placeholder="🛍️" maxLength={4} /></label>
      <button className="btn-primary" disabled={busy} type="submit">Add</button>
      {error && <p className="full" style={{ color: "var(--red)" }}>{error}</p>}
    </form>
  );
}

export function ApproveSellerButton({ id, approved }: { id: string; approved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/admin/sellers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: !approved }),
    });
    setBusy(false);
    if (!res.ok) return alert("Could not update the seller");
    router.refresh();
  }

  return (
    <button className={`btn-sm ${approved ? "danger" : ""}`} disabled={busy} onClick={toggle}>
      {approved ? "Suspend" : "Approve"}
    </button>
  );
}

export function AddVoucherForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Failed");
    form.reset();
    router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <label>Code<input name="code" required placeholder="RAYA20" style={{ textTransform: "uppercase" }} /></label>
      <label>
        Type
        <select name="kind" defaultValue="PERCENT">
          <option value="PERCENT">Percent off</option>
          <option value="AMOUNT">Fixed amount off</option>
        </select>
      </label>
      <label>Value <span className="hint">(10 = 10% or 10.00 off)</span><input name="value" type="number" step="0.01" min={0.01} required /></label>
      <label>Minimum spend <span className="hint">(optional)</span><input name="minSpend" type="number" step="0.01" min={0} /></label>
      <label>Max total uses <span className="hint">(optional)</span><input name="maxUses" type="number" min={1} step={1} /></label>
      <label>Expires on <span className="hint">(optional)</span><input name="expiresAt" type="date" /></label>
      {error && <p className="full" style={{ color: "var(--red)" }}>{error}</p>}
      <div className="full"><button className="btn-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Create voucher"}</button></div>
    </form>
  );
}

export function ToggleVoucherButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch("/api/admin/vouchers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    setBusy(false);
    if (!res.ok) return alert("Could not update the voucher");
    router.refresh();
  }

  return (
    <button className={`btn-sm ${active ? "danger" : ""}`} disabled={busy} onClick={toggle}>
      {active ? "Turn off" : "Turn on"}
    </button>
  );
}
