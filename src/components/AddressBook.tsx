"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Addr = { id: string; name: string; phone: string; address: string; city: string; isDefault: boolean };

export default function AddressBook({ addresses, defaultName }: { addresses: Addr[]; defaultName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Something went wrong");
      return false;
    }
    router.refresh();
    return true;
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const ok = await call("/api/addresses", "POST", Object.fromEntries(new FormData(form).entries()));
    if (ok) form.reset();
  }

  return (
    <>
      <section className="section">
        <div className="section-head"><h2>My addresses ({addresses.length})</h2></div>
        {addresses.length === 0 ? (
          <div className="empty">No saved addresses yet.</div>
        ) : (
          addresses.map((a) => (
            <div className="pad" key={a.id} style={{ borderBottom: "1px solid var(--line)", display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <strong>{a.name}</strong> · {a.phone} {a.isDefault && <span className="badge DELIVERED">Default</span>}
                <div style={{ color: "var(--muted)", marginTop: 4 }}>{a.address}, {a.city}</div>
              </div>
              <div className="row-actions">
                {!a.isDefault && <button className="btn-sm ghost" disabled={busy} onClick={() => call(`/api/addresses/${a.id}`, "PATCH")}>Make default</button>}
                <button className="btn-sm danger" disabled={busy} onClick={() => confirm("Delete this address?") && call(`/api/addresses/${a.id}`, "DELETE")}>Delete</button>
              </div>
            </div>
          ))
        )}
      </section>
      <section className="section auth-card">
        <div className="section-head"><h2>Add an address</h2></div>
        <form className="form" onSubmit={add}>
          <label>Full name<input name="name" required defaultValue={defaultName} maxLength={80} /></label>
          <label>Phone number<input name="phone" required inputMode="tel" maxLength={30} /></label>
          <label>Address<textarea name="address" rows={3} required maxLength={300} /></label>
          <label>City<input name="city" required maxLength={60} autoComplete="address-level2" /></label>
          {error && <p style={{ color: "var(--red)" }}>{error}</p>}
          <button className="btn-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save address"}</button>
        </form>
      </section>
    </>
  );
}
