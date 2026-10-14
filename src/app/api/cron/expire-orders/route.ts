import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { expireUnpaidOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * Called on a schedule (see vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>".
 * With no CRON_SECRET set the route stays closed, so nobody can trigger it from outside.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, cancelled: await expireUnpaidOrders(24) });
}
