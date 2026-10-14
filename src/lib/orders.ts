import type { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * When every item of an order is cancelled, the voucher use is given back (once only,
 * guarded by Order.voucherReleased so two cancellations at the same moment can't release it twice).
 */
export async function releaseVoucherIfAllCancelled(tx: Prisma.TransactionClient, orderId: string) {
  const open = await tx.orderItem.count({ where: { orderId, status: { not: "CANCELLED" } } });
  if (open > 0) return;
  const claimed = await tx.order.updateMany({
    where: { id: orderId, voucherReleased: false, voucherCode: { not: null } },
    data: { voucherReleased: true },
  });
  if (claimed.count === 0) return;
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { voucherCode: true } });
  if (order?.voucherCode) {
    await tx.voucher.updateMany({ where: { code: order.voucherCode, used: { gt: 0 } }, data: { used: { decrement: 1 } } });
  }
}

/**
 * Puts a cancelled item back on sale. With a variant, that variant's stock goes up too.
 * If the seller deleted the variant meanwhile (variantName left, variantId gone) the units can't be put back anywhere.
 */
export async function restockItem(
  tx: Prisma.TransactionClient,
  i: { productId: string; quantity: number; variantId: string | null; variantName: string | null },
) {
  const variantGone = !i.variantId && !!i.variantName;
  if (i.variantId) {
    await tx.productVariant.updateMany({ where: { id: i.variantId }, data: { stock: { increment: i.quantity } } });
  }
  await tx.product.update({
    where: { id: i.productId },
    data: { ...(variantGone ? {} : { stock: { increment: i.quantity } }), sold: { decrement: i.quantity } },
  });
}

const HOUR = 60 * 60 * 1000;

/**
 * Cancels card orders that were never paid within `hours`: items are cancelled, stock goes back on sale
 * and a voucher use is returned. Safe to run again and again. Returns how many orders were touched.
 */
export async function expireUnpaidOrders(hours = 24) {
  const h = Math.min(24 * 30, Math.max(1, Math.floor(hours) || 24));
  const cutoff = new Date(Date.now() - h * HOUR);
  const stale = await db.order.findMany({
    where: { payment: "CARD", paid: false, createdAt: { lt: cutoff }, items: { some: { status: "PENDING" } } },
    select: { id: true },
    take: 200,
  });
  for (const o of stale) {
    await db.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({ where: { orderId: o.id, status: "PENDING" } });
      for (const i of items) {
        // Matching on "still unpaid" means a payment that arrives right now is not undone.
        const r = await tx.orderItem.updateMany({ where: { id: i.id, status: "PENDING", order: { paid: false } }, data: { status: "CANCELLED" } });
        if (r.count === 0) continue;
        await restockItem(tx, i);
      }
      await releaseVoucherIfAllCancelled(tx, o.id);
    });
  }
  return stale.length;
}
