import { db } from "./db";
import { RETURN_MS } from "./returns";

export type Earnings = {
  available: number; // can be paid out now (can be negative if the seller owes commission on cash orders)
  pending: number; // delivered, but still inside the return window or has an open return
  paidOut: number;
  commission: number; // total commission on counted sales
  sales: number; // delivered goods total, not refunded
};

/**
 * Seller ledger. For every delivered item that was not refunded:
 *  - card order (paid): the marketplace holds the money, so the seller is owed price minus commission;
 *  - cash on delivery: the seller kept the cash, so the seller owes the commission (a negative amount).
 * Items are "pending" until the return window has passed and no return is open; then they become "available".
 * Vouchers are paid for by the marketplace, so they do not reduce the seller's share.
 */
export async function earningsForSellers(sellerIds?: string[]) {
  const items = await db.orderItem.findMany({
    where: { status: "DELIVERED", product: sellerIds ? { sellerId: { in: sellerIds } } : undefined },
    select: {
      price: true,
      quantity: true,
      commissionPct: true,
      deliveredAt: true,
      product: { select: { sellerId: true } },
      order: { select: { payment: true, paid: true } },
      returnRequest: { select: { status: true } },
    },
  });
  const payouts = await db.payout.groupBy({
    by: ["sellerId"],
    where: sellerIds ? { sellerId: { in: sellerIds } } : undefined,
    _sum: { amount: true },
  });

  const out = new Map<string, Earnings>();
  const get = (id: string) => {
    let e = out.get(id);
    if (!e) out.set(id, (e = { available: 0, pending: 0, paidOut: 0, commission: 0, sales: 0 }));
    return e;
  };
  const now = Date.now();
  for (const i of items) {
    const r = i.returnRequest?.status;
    if (r === "REFUNDED") continue;
    const e = get(i.product.sellerId);
    const gross = i.price * i.quantity;
    const commission = Math.round((gross * i.commissionPct) / 100);
    const delta = i.order.payment === "CARD" && i.order.paid ? gross - commission : -commission;
    const open = r === "REQUESTED" || r === "APPROVED";
    const settled = !open && !!i.deliveredAt && now - i.deliveredAt.getTime() > RETURN_MS;
    if (settled) e.available += delta;
    else e.pending += delta;
    e.commission += commission;
    e.sales += gross;
  }
  for (const p of payouts) {
    const e = get(p.sellerId);
    e.paidOut = p._sum.amount ?? 0;
    e.available -= e.paidOut;
  }
  return out;
}

export const emptyEarnings = (): Earnings => ({ available: 0, pending: 0, paidOut: 0, commission: 0, sales: 0 });
