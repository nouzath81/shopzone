"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";

type Addr = { id: string; name: string; phone: string; address: string; city: string; isDefault: boolean };

export default function CheckoutForm({ defaultName, addresses, cardEnabled }: { defaultName: string; addresses: Addr[]; cardEnabled: boolean }) {
  const first = addresses[0]; // the default address comes first
  const { lines, total, clear } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [voucherMsg, setVoucherMsg] = useState("");
  const [city, setCity] = useState(first?.city ?? "");
  const [name, setName] = useState(first?.name ?? defaultName);
  const [phone, setPhone] = useState(first?.phone ?? "");
  const [address, setAddress] = useState(first?.address ?? "");
  const [save, setSave] = useState(false);

  function pick(id: string) {
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setName(a.name);
    setPhone(a.phone);
    setAddress(a.address);
    setCity(a.city);
  }

  const items = lines.map((l) => ({ id: l.id, variantId: l.variantId, quantity: l.quantity }));

  // Shipping comes from the server (each seller's fee and free-shipping rule).
  const [ship, setShip] = useState<{ shipping: number; parts: { shopName: string; fee: number; free: boolean }[] } | null>(null);
  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    // Short pause so we don't ask the server on every key press while the city is being typed.
    const t = setTimeout(() => {
      fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: JSON.parse(itemsKey), city }),
      })
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setShip(d); })
        .catch(() => null);
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, city]);

  async function applyVoucher() {
    setVoucherMsg("");
    if (!code.trim()) return;
    const res = await fetch("/api/vouchers/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, items }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setApplied(null);
      return setVoucherMsg(data.error ?? "Voucher not valid");
    }
    setApplied({ code: data.code, discount: data.discount });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        phone: f.get("phone"),
        address: f.get("address"),
        city: f.get("city"),
        payment: f.get("payment"),
        items,
        voucher: applied?.code,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.status === 401) return router.push("/login?next=/checkout");
    if (!res.ok) return setError(data.error ?? "Could not place order");
    if (save) {
      // Best effort: a failure here must not get in the way of the order that was just placed.
      await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address, city }),
      }).catch(() => null);
    }
    clear();
    // Card orders go on to the payment page, Cash on Delivery orders are done.
    router.push(data.card ? `/order/${data.id}/pay` : `/order/${data.id}?placed=1`);
  }

  if (lines.length === 0) {
    return (
      <section className="section" style={{ marginTop: 16 }}>
        <div className="empty">
          Nothing to check out. <Link href="/" style={{ color: "var(--brand)" }}>Go shopping</Link>
        </div>
      </section>
    );
  }

  return (
    <form className="two-col" onSubmit={submit}>
      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2>Delivery Details</h2></div>
        <div className="form">
          {addresses.length > 0 && (
            <label>
              Saved addresses
              <select defaultValue={first.id} onChange={(e) => pick(e.target.value)}>
                {addresses.map((a) => <option key={a.id} value={a.id}>{a.name}, {a.address.slice(0, 40)}, {a.city}</option>)}
              </select>
            </label>
          )}
          <label>Full name<input name="name" required value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Phone number<input name="phone" required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label>Address<textarea name="address" rows={3} required value={address} onChange={(e) => setAddress(e.target.value)} /></label>
          <label>City<input name="city" required value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" /></label>
          <label className="radio"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /> Save this address to my address book</label>
          <strong style={{ marginTop: 8 }}>Payment method</strong>
          <label className="radio"><input type="radio" name="payment" value="COD" defaultChecked /> Cash on Delivery</label>
          {cardEnabled && (
            <label className="radio"><input type="radio" name="payment" value="CARD" /> Pay online by card (Visa / Mastercard) via PayHere</label>
          )}
        </div>
      </section>

      <aside className="summary">
        <h3>Order Summary</h3>
        {lines.map((l) => (
          <div className="row" key={l.key}>
            <span>{l.title}{l.variantName ? ` (${l.variantName})` : ""} × {l.quantity}</span>
            <span>{money(l.price * l.quantity)}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyVoucher(); } }}
            placeholder="Voucher code"
            style={{ flex: 1, padding: 8, border: "1px solid var(--line)", borderRadius: 3, minWidth: 0 }}
          />
          <button type="button" className="btn-sm ghost" onClick={applyVoucher}>Apply</button>
        </div>
        {voucherMsg && <p style={{ color: "var(--red)", fontSize: 12 }}>{voucherMsg}</p>}
        {ship?.parts.map((s) => (
          <div className="row" key={s.shopName}>
            <span>Shipping · {s.shopName}</span>
            {s.free ? <span className="ok">Free</span> : <span>{money(s.fee)}</span>}
          </div>
        ))}
        {applied && (
          <div className="row ok"><span>Voucher {applied.code}</span><span>−{money(applied.discount)}</span></div>
        )}
        <div className="row total"><span>Total</span><span>{money(total - (applied?.discount ?? 0) + (ship?.shipping ?? 0))}</span></div>
        {error && <p style={{ color: "var(--red)" }}>{error}</p>}
        <button className="btn-primary" disabled={busy} type="submit">{busy ? "Placing order…" : "Place Order"}</button>
      </aside>
    </form>
  );
}
