import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

/** Changes a seller's commission. Only affects orders placed after the change. */
export async function PATCH(req: Request) {
  const user = await getUser();
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const b = await req.json().catch(() => null);
  const pct = Number(b?.commissionPct);
  if (!Number.isInteger(pct) || pct < 0 || pct > 50) return NextResponse.json({ error: "Commission must be a whole number from 0 to 50" }, { status: 400 });
  const r = await db.seller.updateMany({ where: { id: String(b?.sellerId ?? "") }, data: { commissionPct: pct } });
  if (r.count === 0) return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
