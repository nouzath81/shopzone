import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { notifyReturn } from "@/lib/notify";
import { refundFor } from "@/lib/returns";

/**
 * Seller or admin: approve / reject a requested return.
 * Admin only: mark an approved return as refunded (after the money went back to the customer).
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const action = String(b?.action ?? "");
  const note = typeof b?.note === "string" ? b.note.trim().slice(0, 500) || null : null;
  if (!["approve", "reject", "refund"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const ret = await db.returnRequest.findUnique({
    where: { id: params.id },
    include: { orderItem: { include: { product: true, order: { include: { items: true } } } } },
  });
  if (!ret) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = user.role === "ADMIN";
  const isSeller = !!user.seller && ret.orderItem.product.sellerId === user.seller.id;
  if (!isAdmin && !isSeller) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  if (action === "refund") {
    if (!isAdmin) return NextResponse.json({ error: "Only an admin can mark a return as refunded" }, { status: 403 });
    const r = await db.returnRequest.updateMany({ where: { id: ret.id, status: "APPROVED" }, data: { status: "REFUNDED", refundedAt: new Date() } });
    if (r.count === 0) return NextResponse.json({ error: "This return is not waiting for a refund" }, { status: 409 });
    await notifyReturn(ret.id, "refunded");
    return NextResponse.json({ ok: true });
  }

  const approve = action === "approve";
  const r = await db.returnRequest.updateMany({
    where: { id: ret.id, status: "REQUESTED" },
    data: {
      status: approve ? "APPROVED" : "REJECTED",
      note,
      decidedAt: new Date(),
      ...(approve ? { refundAmount: refundFor(ret.orderItem, ret.orderItem.order) } : {}),
    },
  });
  if (r.count === 0) return NextResponse.json({ error: "This return was already decided" }, { status: 409 });
  await notifyReturn(ret.id, approve ? "approved" : "rejected");
  return NextResponse.json({ ok: true });
}
