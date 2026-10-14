import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { expireUnpaidOrders } from "@/lib/orders";

/** Admin button: cancel card orders that were not paid within `hours` (default 24). */
export async function POST(req: Request) {
  const user = await getUser();
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const b = await req.json().catch(() => null);
  const cancelled = await expireUnpaidOrders(Number(b?.hours) || 24);
  return NextResponse.json({ ok: true, cancelled });
}
