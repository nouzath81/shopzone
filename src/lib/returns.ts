export const RETURN_DAYS = 7;
export const RETURN_MS = RETURN_DAYS * 24 * 60 * 60 * 1000;

/** True while a delivered item can still be returned. */
export function withinReturnWindow(deliveredAt: Date | null, now = Date.now()) {
  return !!deliveredAt && now - deliveredAt.getTime() <= RETURN_MS;
}

/**
 * What the customer gets back for one item: its price, minus its share of any voucher
 * (the voucher was spread over all goods in the order). Shipping is not refunded.
 */
export function refundFor(item: { price: number; quantity: number }, order: { discount: number; items: { price: number; quantity: number }[] }) {
  const line = item.price * item.quantity;
  const goods = order.items.reduce((n, i) => n + i.price * i.quantity, 0);
  const share = goods > 0 ? Math.round((order.discount * line) / goods) : 0;
  return Math.max(0, line - share);
}
