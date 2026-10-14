import { db } from "./db";

export type DayPoint = { date: string; revenue: number; orders: number };

export const RANGES = [7, 30, 90] as const;

export function parseDays(v: string | undefined): (typeof RANGES)[number] {
  const n = Number(v);
  return (RANGES as readonly number[]).includes(n) ? (n as (typeof RANGES)[number]) : 30;
}

// Days are cut at midnight in the shop's own timezone, not the server's.
const TZ = process.env.SHOP_TIMEZONE ?? "Asia/Colombo";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }); // "2026-10-10"

/**
 * Sales per day for the last `days` days (today included), with empty days filled in as zero.
 * Revenue is the goods total of non-cancelled items (shipping and vouchers are not included).
 * Pass `sellerId` to see one seller's numbers.
 */
export async function dailySales(days: number, sellerId?: string): Promise<DayPoint[]> {
  const todayKey = dayKey(new Date());

  // List every day key from oldest to today using plain date maths on the key.
  const keys: string[] = [];
  const base = new Date(`${todayKey}T00:00:00Z`);
  for (let i = days - 1; i >= 0; i--) {
    keys.push(new Date(base.getTime() - i * 86_400_000).toISOString().slice(0, 10));
  }

  // Fetch a little extra (timezone edges), then bucket by the shop-timezone day.
  const since = new Date(base.getTime() - (days + 1) * 86_400_000);
  const items = await db.orderItem.findMany({
    where: {
      status: { not: "CANCELLED" },
      order: { createdAt: { gte: since } },
      ...(sellerId ? { product: { sellerId } } : {}),
    },
    select: { quantity: true, price: true, orderId: true, order: { select: { createdAt: true } } },
  });

  const byDay = new Map<string, { revenue: number; orderIds: Set<string> }>(
    keys.map((k) => [k, { revenue: 0, orderIds: new Set<string>() }]),
  );
  for (const i of items) {
    const bucket = byDay.get(dayKey(i.order.createdAt));
    if (!bucket) continue; // outside the window
    bucket.revenue += i.quantity * i.price;
    bucket.orderIds.add(i.orderId);
  }

  return keys.map((date) => {
    const b = byDay.get(date)!;
    return { date, revenue: b.revenue, orders: b.orderIds.size };
  });
}
