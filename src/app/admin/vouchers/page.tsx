import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { money } from "@/lib/format";
import { AddVoucherForm, ToggleVoucherButton } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

export default async function AdminVouchers() {
  await requireAdmin();
  const vouchers = await db.voucher.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2>Create a voucher</h2></div>
        <AddVoucherForm />
      </section>
      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2>Vouchers ({vouchers.length})</h2></div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Code</th><th>Discount</th><th>Min spend</th><th>Used</th><th>Expires</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.code}</strong></td>
                  <td>{v.percentOff ? `${v.percentOff}% off` : `${money(v.amountOff ?? 0)} off`}</td>
                  <td>{v.minSpend ? money(v.minSpend) : "—"}</td>
                  <td>{v.used}{v.maxUses ? ` / ${v.maxUses}` : ""}</td>
                  <td>{v.expiresAt ? v.expiresAt.toLocaleDateString("en-GB") : "Never"}</td>
                  <td><span className={`badge ${v.active ? "DELIVERED" : "off"}`}>{v.active ? "On" : "Off"}</span></td>
                  <td><ToggleVoucherButton id={v.id} active={v.active} /></td>
                </tr>
              ))}
              {vouchers.length === 0 && <tr><td colSpan={7} style={{ color: "var(--muted)" }}>No vouchers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
