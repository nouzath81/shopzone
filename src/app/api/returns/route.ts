import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { notifyReturn } from "@/lib/notify";
import { RETURN_DAYS, withinReturnWindow } from "@/lib/returns";

/** A customer asks to return a delivered item. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const orderItemId = String(b?.orderItemId ?? "");
  const reason = String(b?.reason ?? "").trim();
  if (reason.length < 10 || reason.length > 500) {
    return NextResponse.json({ error: "Please explain the reason in 10–500 characters" }, { status: 400 });
  }

  const item = await db.orderItem.findUnique({ where: { id: orderItemId }, include: { order: true } });
  if (!item || item.order.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.status !== "DELIVERED") return NextResponse.json({ error: "Only delivered items can be returned" }, { status: 400 });
  if (!withinReturnWindow(item.deliveredAt)) {
    return NextResponse.json({ error: `The ${RETURN_DAYS}-day return period for this item has ended` }, { status: 400 });
  }

  try {
    const created = await db.returnRequest.create({ data: { orderItemId, userId: user.id, reason } });
    await notifyReturn(created.id, "requested");
  } catch (e) {
    // orderItemId is unique: a second request for the same item hits this.
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "You already asked to return this item" }, { status: 409 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}
