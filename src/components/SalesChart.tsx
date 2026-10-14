"use client";

import { useState } from "react";
import { money } from "@/lib/format";

type Point = { date: string; revenue: number; orders: number }; // revenue in cents

// One series, so one colour (brand orange; passes the 3:1 contrast check on the card surface).
const BAR = "#d95e12";
const BAR_HOVER = "#b44a0a";

const W = 720;
const H = 260;
const M = { top: 22, right: 12, bottom: 28, left: 50 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

const prettyDate = (key: string, withYear = false) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });

/** 1200 -> "1.2K", 2500000 -> "2.5M". Used for axis ticks and the peak label. */
function compact(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

/** Round the top of the axis up to a clean number and give 4 evenly spaced steps. */
function niceScale(maxUnits: number) {
  if (maxUnits <= 0) return { max: 4, step: 1 };
  const rough = maxUnits / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const mult = [1, 2, 2.5, 5, 10].find((m) => m * mag >= rough) ?? 10;
  const step = mult * mag;
  return { max: step * 4, step };
}

export default function SalesChart({ title, points, days }: { title: string; points: Point[]; days: number }) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const n = points.length;
  const totalRevenue = points.reduce((s, p) => s + p.revenue, 0);
  const totalOrders = points.reduce((s, p) => s + p.orders, 0);
  const peakIndex = points.reduce((best, p, i) => (p.revenue > points[best].revenue ? i : best), 0);

  const scale = niceScale(Math.max(...points.map((p) => p.revenue)) / 100);
  const yOf = (units: number) => M.top + PH - (units / scale.max) * PH;

  const slot = PW / n;
  const barW = Math.max(2, Math.min(24, slot - 2)); // thin marks: never wider than 24px, 2px air between neighbours
  const xOf = (i: number) => M.left + i * slot + (slot - barW) / 2;

  // About six date labels, always including the most recent day.
  const labelEvery = Math.ceil(n / 6);

  const summary = `${title}: ${money(totalRevenue)} from ${totalOrders} orders in the last ${days} days.`;

  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="section-head" style={{ flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2>{title}</h2>
          <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
            <strong style={{ color: "var(--ink)" }}>{money(totalRevenue)}</strong> · {totalOrders} order{totalOrders === 1 ? "" : "s"} · last {days} days
          </p>
        </div>
        <button type="button" className="btn-sm ghost" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <div className="table-wrap" style={{ maxHeight: 320, overflowY: "auto" }}>
          <table className="t">
            <thead>
              <tr><th>Date</th><th>Orders</th><th>Sales</th></tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date}>
                  <td>{prettyDate(p.date, true)}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{p.orders}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{money(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ position: "relative", padding: "8px 8px 12px" }} onPointerLeave={() => setActive(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="group" aria-label={summary}>
            {/* gridlines + y-axis ticks: hairline, solid, recessive */}
            {[0, 1, 2, 3, 4].map((t) => {
              const v = t * scale.step;
              const y = yOf(v);
              return (
                <g key={t}>
                  <line x1={M.left} x2={W - M.right} y1={y} y2={y} stroke="#e8e8e8" strokeWidth={1} />
                  <text x={M.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--muted)" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {compact(v)}
                  </text>
                </g>
              );
            })}

            {/* columns: 4px rounded data end, square at the baseline */}
            {points.map((p, i) => {
              const h = p.revenue > 0 ? Math.max(2, (p.revenue / 100 / scale.max) * PH) : 0;
              if (h === 0) return null;
              const x = xOf(i);
              const y = M.top + PH - h;
              const r = Math.min(4, h / 2, barW / 2);
              return (
                <path
                  key={p.date}
                  d={`M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${y + h} Z`}
                  fill={active === i ? BAR_HOVER : BAR}
                />
              );
            })}

            {/* one direct label: the best day (labels are sparing; the tooltip and table carry the rest) */}
            {points[peakIndex].revenue > 0 && (
              <text
                x={Math.min(W - M.right - 28, Math.max(M.left + 28, xOf(peakIndex) + barW / 2))}
                y={yOf(points[peakIndex].revenue / 100) - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="var(--ink)"
              >
                {compact(points[peakIndex].revenue / 100)}
              </text>
            )}

            {/* x-axis dates */}
            {points.map((p, i) =>
              (n - 1 - i) % labelEvery === 0 ? (
                <text
                  key={p.date}
                  // the newest date sits flush with the right edge so it is never cut off
                  x={i === n - 1 ? W - M.right : xOf(i) + barW / 2}
                  y={H - 8}
                  textAnchor={i === n - 1 ? "end" : "middle"}
                  fontSize={11}
                  fill="var(--muted)"
                >
                  {prettyDate(p.date)}
                </text>
              ) : null,
            )}

            {/* baseline */}
            <line x1={M.left} x2={W - M.right} y1={M.top + PH} y2={M.top + PH} stroke="#cfcfcf" strokeWidth={1} />

            {/* hover/focus targets: the whole day slot, much bigger than the bar itself */}
            {points.map((p, i) => (
              <rect
                key={p.date}
                x={M.left + i * slot}
                y={M.top}
                width={slot}
                height={PH}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${prettyDate(p.date, true)}: ${money(p.revenue)}, ${p.orders} orders`}
                onPointerEnter={() => setActive(i)}
                onPointerMove={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                style={{ outline: "none" }}
              />
            ))}
          </svg>

          {totalOrders === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--muted)", pointerEvents: "none" }}>
              No sales in this period yet
            </div>
          )}

          {active !== null && (
            <div
              role="status"
              style={{
                position: "absolute",
                pointerEvents: "none",
                zIndex: 5,
                background: "#fff",
                border: "1px solid var(--line)",
                borderRadius: 4,
                boxShadow: "0 4px 14px rgba(0,0,0,.12)",
                padding: "8px 10px",
                fontSize: 12,
                whiteSpace: "nowrap",
                left: `${((xOf(active) + barW / 2) / W) * 100}%`,
                top: `${(Math.min(yOf(points[active].revenue / 100), M.top + PH - 4) / H) * 100}%`,
                transform: `translate(${active < n * 0.15 ? "-10%" : active > n * 0.85 ? "-90%" : "-50%"}, calc(-100% - 8px))`,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{money(points[active].revenue)}</div>
              <div style={{ color: "var(--muted)" }}>{prettyDate(points[active].date, true)}</div>
              <div style={{ color: "var(--muted)" }}>{points[active].orders} order{points[active].orders === 1 ? "" : "s"}</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
