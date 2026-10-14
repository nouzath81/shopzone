import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { earningsForSellers, emptyEarnings } from "@/lib/earnings";
import { money } from "@/lib/format";
import { CommissionForm, PayoutForm } from "@/components/AdminMoney";

export const dynamic = "force-dynamic";

export default async function AdminPayouts() {
  await requireAdmin();
  const sellers = await db.seller.findMany({ orderBy: { shopName: "asc" } });
  const earnings = await earningsForSellers();
  const recent = await db.payout.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { seller: true } });

  return (
    <>
      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2>Seller payouts &amp; commission</h2></div>
        <div className="pad" style={{ color: "var(--muted)", fontSize: 13 }}>
          Send the money by bank transfer yourself, then record it here so the seller&apos;s balance goes down. A negative balance means a seller owes commission on cash orders. A new commission rate only applies to orders placed after the change.
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Seller</th><th>Commission</th><th>Sales</th><th>Pending</th><th>Paid out</th><th>Available</th><th>Pay</th></tr></thead>
            <tbody>
              {sellers.map((s) => {
                const e = earnings.get(s.id) ?? emptyEarnings();
                return (
                  <tr key={s.id}>
                    <td>{s.shopName}</td>
                    <td><CommissionForm sellerId={s.id} pct={s.commissionPct} /></td>
                    <td>{money(e.sales)}</td>
                    <td>{money(e.pending)}</td>
                    <td>{money(e.paidOut)}</td>
                    <td><strong style={e.available < 0 ? { color: "var(--red)" } : undefined}>{money(e.available)}</strong></td>
                    <td><PayoutForm sellerId={s.id} max={e.available} /></td>
                  </tr>
                );
              })}
              {sellers.length === 0 && <tr><td colSpan={7} style={{ color: "var(--muted)" }}>No sellers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="section">
        <div className="section-head"><h2>Recent payouts</h2></div>
        {recent.length === 0 ? <div className="empty">No payouts recorded.</div> : (
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Date</th><th>Seller</th><th>Amount</th><th>Note</th></tr></thead>
              <tbody>{recent.map((p) => <tr key={p.id}><td>{p.createdAt.toLocaleDateString("en-GB")}</td><td>{p.seller.shopName}</td><td>{money(p.amount)}</td><td>{p.note ?? ""}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
