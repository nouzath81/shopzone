"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ShopProfileForm({
  shopName,
  about,
  shippingFee,
  shippingPerKg,
  freeShippingOver,
  zones,
}: {
  shopName: string;
  about: string;
  shippingFee: number; // cents
  shippingPerKg: number; // cents
  freeShippingOver: number | null; // cents
  zones: { city: string; fee: number }[]; // fee in cents
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [rows, setRows] = useState<{ city: string; fee: string }[]>(zones.map((z) => ({ city: z.city, fee: String(z.fee / 100) })));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/seller/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName: f.get("shopName"),
        about: f.get("about"),
        shippingFee: f.get("shippingFee"),
        shippingPerKg: f.get("shippingPerKg"),
        freeShippingOver: f.get("freeShippingOver"),
        zones: rows.filter((r) => r.city.trim() && r.fee !== ""),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not save");
    setSaved(true);
    router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <label className="full">
        Shop name
        <input name="shopName" required minLength={2} maxLength={60} defaultValue={shopName} />
      </label>
      <label className="full">
        About your shop <span className="hint">(shown on your public shop page, max 600 characters)</span>
        <textarea name="about" rows={5} maxLength={600} defaultValue={about} />
      </label>
      <label>
        Shipping fee per order <span className="hint">(0 = free shipping)</span>
        <input name="shippingFee" type="number" min={0} step="0.01" required defaultValue={shippingFee / 100} />
      </label>
      <label>
        Extra fee for each additional kg <span className="hint">(optional · 0 = weight does not matter · needs weights on your products)</span>
        <input name="shippingPerKg" type="number" min={0} step="0.01" defaultValue={shippingPerKg / 100} />
      </label>
      <label>
        Free shipping when the goods total is over <span className="hint">(optional)</span>
        <input name="freeShippingOver" type="number" min={0} step="0.01" defaultValue={freeShippingOver !== null ? freeShippingOver / 100 : ""} />
      </label>
      <div className="full">
        <strong>Different fee for certain cities</strong>
        <span className="hint" style={{ display: "block", marginBottom: 8 }}>
          Optional. When the customer&apos;s city matches, this fee is used instead of the shipping fee above (0 = free). Other cities use the usual fee.
        </span>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input placeholder="City, e.g. Colombo" maxLength={60} value={r.city} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, city: e.target.value } : x)))} style={{ flex: 2, minWidth: 0 }} />
            <input placeholder="Fee" type="number" min={0} step="0.01" value={r.fee} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, fee: e.target.value } : x)))} style={{ flex: 1, minWidth: 0 }} />
            <button type="button" className="btn-sm ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove city">✕</button>
          </div>
        ))}
        {rows.length < 50 && (
          <button type="button" className="btn-sm ghost" onClick={() => setRows([...rows, { city: "", fee: "" }])}>+ Add a city</button>
        )}
      </div>
      {error && <p className="full" style={{ color: "var(--red)" }}>{error}</p>}
      {saved && <p className="full ok">Saved ✓</p>}
      <div className="full">
        <button className="btn-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}
