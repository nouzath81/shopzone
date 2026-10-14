"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

/** Buttons for the next sensible status. `who` decides which moves are offered. */
export default function StatusButtons({ id, status, who, canCancel = true }: { id: string; status: Status; who: "SELLER" | "CUSTOMER" | "ADMIN"; canCancel?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function move(to: Status) {
    if (to === "CANCELLED" && !confirm("Cancel this item? Stock will be returned.")) return;
    let trackingNo: string | undefined;
    if (to === "SHIPPED") {
      const t = window.prompt("Courier and tracking number (optional), e.g. Pronto 123456789:");
      if (t === null) return; // pressed Cancel: don't ship yet
      trackingNo = t.trim() || undefined;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/order-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to, trackingNo }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Failed");
    router.refresh();
  }

  const actions: { to: Status; label: string; cls?: string }[] = [];
  if (who === "CUSTOMER") {
    if (status === "PENDING" && canCancel) actions.push({ to: "CANCELLED", label: "Cancel", cls: "danger" });
  } else if (who === "SELLER") {
    if (status === "PENDING") actions.push({ to: "SHIPPED", label: "Mark shipped" }, { to: "CANCELLED", label: "Cancel", cls: "danger" });
    if (status === "SHIPPED") actions.push({ to: "DELIVERED", label: "Mark delivered" });
  } else if (status !== "CANCELLED") {
    if (status === "PENDING") actions.push({ to: "SHIPPED", label: "Ship" });
    if (status === "SHIPPED") actions.push({ to: "DELIVERED", label: "Delivered" });
    if (status !== "DELIVERED") actions.push({ to: "CANCELLED", label: "Cancel", cls: "danger" });
  }

  if (actions.length === 0) return null;
  return (
    <div className="row-actions">
      {actions.map((a) => (
        <button key={a.to} className={`btn-sm ${a.cls ?? ""}`} disabled={busy} onClick={() => move(a.to)}>
          {a.label}
        </button>
      ))}
      {error && <span style={{ color: "var(--red)", fontSize: 12 }}>{error}</span>}
    </div>
  );
}
