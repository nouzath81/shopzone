import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth";
import { earningsForSellers, emptyEarnings } from "@/lib/earnings";
import { money } from "@/lib/format";
import { RETURN_DAYS } from "@/lib/returns";

export const dynamic = "force-dynamic";

export default async function SellerEarnings() {
  const { seller } = await requireSeller();
  const e = (await earningsForSellers([seller.id])).get(seller.id) ?? emptyEarnings();
  const payouts = await db.payout.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <>
      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2>Earnings</h2></div>
        <div className="stats">
          <div className="stat"><b>{money(e.available)}</b><span>Available for payout</span></div>
          <div className="stat"><b>{money(e.pending)}</b><span>Pending (return period)</span></div>
          <div className="stat"><b>{money(e.paidOut)}</b><span>Paid out so far</span></div>
          <div className="stat"><b>{seller.commissionPct}%</b><span>Commission</span></div>
        </div>
        <div className="pad" style={{ color: "var(--muted)", fontSize: 13 }}>
          <p>Delivered sales: {money(e.sales)}, commission: {money(e.commission)}.</p>
          <p style={{ marginTop: 4 }}>
            Card orders: ShopZone holds the money and pays you the price minus commission. Cash on delivery: you keep the cash, so the commission is deducted from your balance (it can go below zero).
            Earnings become available {RETURN_DAYS} days after delivery, as long as no return is open. Returned and refunded items do not count. Vouchers are paid by ShopZone and do not reduce your share.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="section-head"><h2>Payouts</h2></div>
        {payouts.length === 0 ? (
          <div className="empty">No payouts yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Date</th><th>Amount</th><th>Note</th></tr></thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}><td>{p.createdAt.toLocaleDateString("en-GB")}</td><td>{money(p.amount)}</td><td>{p.note ?? ""}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
