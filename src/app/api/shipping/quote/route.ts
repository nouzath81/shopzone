import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visible } from "@/lib/visible";
import { shippingFor, type ShipSeller } from "@/lib/shipping";

/** Tells the checkout page what shipping will cost, using prices and seller settings from the database. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const items: { id: string; quantity: number }[] = Array.isArray(b?.items) ? b.items : [];
  if (items.length === 0) return NextResponse.json({ shipping: 0, parts: [] });

  const products = await db.product.findMany({
    where: { id: { in: items.map((i) => i.id) }, ...visible },
    include: { seller: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const subtotals = new Map<string, number>();
  const sellers = new Map<string, ShipSeller>();
  const weights = new Map<string, number>();
  for (const i of items) {
    const p = byId.get(i.id);
    const qty = Math.floor(Number(i.quantity));
    if (!p || !(qty > 0)) continue;
    subtotals.set(p.sellerId, (subtotals.get(p.sellerId) ?? 0) + p.price * qty);
    sellers.set(p.sellerId, p.seller);
    weights.set(p.sellerId, (weights.get(p.sellerId) ?? 0) + p.weightGrams * qty);
  }

  const city = typeof b?.city === "string" ? b.city : "";
  const { total, parts } = shippingFor(subtotals, sellers, city, weights);
  return NextResponse.json({ shipping: total, parts });
}
