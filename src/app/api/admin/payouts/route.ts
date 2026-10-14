import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { earningsForSellers } from "@/lib/earnings";

/** Admin records that money was sent to a seller. Cannot exceed what is available. */
export async function POST(req: Request) {
  const user = await getUser();
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const b = await req.json().catch(() => null);
  const sellerId = String(b?.sellerId ?? "");
  const amount = Math.round(Number(b?.amount) * 100);
  const note = typeof b?.note === "string" ? b.note.trim().slice(0, 200) || null : null;
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Enter an amount above 0" }, { status: 400 });
  if (!(await db.seller.findUnique({ where: { id: sellerId } }))) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

  const e = (await earningsForSellers([sellerId])).get(sellerId);
  if (!e || amount > e.available) return NextResponse.json({ error: "That is more than the seller's available balance" }, { status: 400 });

  await db.payout.create({ data: { sellerId, amount, note } });
  return NextResponse.json({ ok: true });
}
