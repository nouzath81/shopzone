type Props = {
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  orderedAt: Date;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  trackingNo: string | null;
};

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");

/** Ordered -> Shipped -> Delivered, with the tracking number once the seller has shipped. */
export default function Timeline({ status, orderedAt, shippedAt, deliveredAt, trackingNo }: Props) {
  if (status === "CANCELLED") {
    return <p style={{ marginTop: 8, color: "var(--red)", fontSize: 12 }}>✕ Cancelled</p>;
  }

  const steps = [
    { label: "Ordered", done: true, date: orderedAt },
    { label: "Shipped", done: status === "SHIPPED" || status === "DELIVERED", date: shippedAt },
    { label: "Delivered", done: status === "DELIVERED", date: deliveredAt },
  ];

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12 }}>
        {steps.map((s) => (
          <span key={s.label} style={{ color: s.done ? "var(--green)" : "var(--muted)", fontWeight: s.done ? 600 : 400 }}>
            {s.done ? "●" : "○"} {s.label}
            {s.done && s.date ? ` · ${fmt(s.date)}` : ""}
          </span>
        ))}
      </div>
      {trackingNo && (
        <p style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
          📦 Tracking: <strong style={{ color: "var(--ink)" }}>{trackingNo}</strong>
        </p>
      )}
    </div>
  );
}
