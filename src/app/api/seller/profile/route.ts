import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { parseZones } from "@/lib/shipping";

export async function PUT(req: Request) {
  const user = await getUser();
  if (!user?.seller || user.role !== "SELLER") return NextResponse.json({ error: "Sellers only" }, { status: 403 });

  const b = await req.json().catch(() => null);
  const shopName = String(b?.shopName ?? "").trim();
  const about = String(b?.about ?? "").trim();
  const toCents = (v: unknown) => (v === "" || v == null ? null : Math.round(Number(v) * 100));
  const shippingFee = toCents(b?.shippingFee) ?? 0;
  const freeShippingOver = toCents(b?.freeShippingOver);
  const shippingPerKg = toCents(b?.shippingPerKg) ?? 0;
  const MAX = 10_000_000; // Rs 100,000: just a sanity limit against typos
  if (!Number.isFinite(shippingFee) || shippingFee < 0 || shippingFee > MAX) return NextResponse.json({ error: "Enter a shipping fee of 0 or more" }, { status: 400 });
  if (!Number.isFinite(shippingPerKg) || shippingPerKg < 0 || shippingPerKg > MAX) return NextResponse.json({ error: "Enter a per-kg fee of 0 or more" }, { status: 400 });
  if (freeShippingOver !== null && (!Number.isFinite(freeShippingOver) || freeShippingOver < 0 || freeShippingOver > MAX)) {
    return NextResponse.json({ error: "Enter a valid free-shipping amount or leave it empty" }, { status: 400 });
  }
  // Delivery zones: [{ city, fee }] where fee is typed in rupees.
  const zones = parseZones(
    (Array.isArray(b?.zones) ? b.zones : []).map((z: { city?: unknown; fee?: unknown }) => ({ city: z?.city, fee: Math.round(Number(z?.fee) * 100) })),
  );
  if (zones.some((z) => z.fee > MAX)) return NextResponse.json({ error: "A zone fee is too large" }, { status: 400 });
  if (shopName.length < 2 || shopName.length > 60) return NextResponse.json({ error: "Shop name must be 2–60 characters" }, { status: 400 });
  if (about.length > 600) return NextResponse.json({ error: "About text can be up to 600 characters" }, { status: 400 });

  // The web address (slug) stays the same so existing links keep working.
  await db.seller.update({ where: { id: user.seller.id }, data: { shopName, about, shippingFee, shippingPerKg, freeShippingOver, shippingZones: zones } });
  return NextResponse.json({ ok: true });
}
