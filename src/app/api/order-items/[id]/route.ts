import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { releaseVoucherIfAllCancelled, restockItem } from "@/lib/orders";
import { notifyCustomerItem } from "@/lib/notify";

const STATUSES = Object.values(OrderStatus);

/** Who may move an order line from one status to another. CANCELLED is final for everyone. */
function allowed(actor: "ADMIN" | "SELLER" | "CUSTOMER", from: OrderStatus, to: OrderStatus) {
  if (from === "CANCELLED" || from === to) return false;
  if (actor === "ADMIN") return true;
  if (actor === "CUSTOMER") return from === "PENDING" && to === "CANCELLED";
  // seller
  if (from === "PENDING") return to === "SHIPPED" || to === "CANCELLED";
  if (from === "SHIPPED") return to === "DELIVERED";
  return false;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const to = b?.status as OrderStatus;
  const trackingNo = typeof b?.trackingNo === "string" ? b.trackingNo.trim().slice(0, 100) || null : null;
  if (!STATUSES.includes(to)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const item = await db.orderItem.findUnique({
    where: { id: params.id },
    include: { product: true, order: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let actor: "ADMIN" | "SELLER" | "CUSTOMER" | null = null;
  if (user.role === "ADMIN") actor = "ADMIN";
  else if (user.seller && item.product.sellerId === user.seller.id) actor = "SELLER";
  else if (item.order.userId === user.id) actor = "CUSTOMER";
  if (!actor) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const unpaidCard = item.order.payment === "CARD" && !item.order.paid;

  // Sellers must not ship (or cancel) goods the customer hasn't paid for yet.
  if (actor === "SELLER" && unpaidCard) {
    return NextResponse.json({ error: "Waiting for the customer's card payment" }, { status: 400 });
  }
  // Money has been taken: refunds are handled by a person, not by a button.
  if (actor === "CUSTOMER" && item.order.paid) {
    return NextResponse.json({ error: "This order is already paid. Please contact support for a refund." }, { status: 400 });
  }

  if (!allowed(actor, item.status, to)) {
    return NextResponse.json({ error: `Cannot change from ${item.status} to ${to}` }, { status: 400 });
  }

  // A customer cancelling part of an unpaid card order cancels the whole order,
  // because the card amount is for the full order.
  const wholeOrder = actor === "CUSTOMER" && unpaidCard && to === "CANCELLED";

  let changed = false;
  await db
    .$transaction(async (tx) => {
      const targets = wholeOrder
        ? await tx.orderItem.findMany({ where: { orderId: item.orderId, status: "PENDING" } })
        : [item];

      for (const t of targets) {
        // Re-check inside the transaction so two clicks can't restock twice.
        const now = new Date();
        const res = await tx.orderItem.updateMany({
          where: { id: t.id, status: t.status },
          data: {
            status: to,
            ...(to === "SHIPPED" ? { shippedAt: now, trackingNo } : {}),
            ...(to === "DELIVERED" ? { deliveredAt: now, shippedAt: t.shippedAt ?? now } : {}),
          },
        });
        if (res.count === 0) {
          if (t.id === item.id) throw new Error("CHANGED");
          continue;
        }
        if (to === "CANCELLED") {
          await restockItem(tx, t);
        }
      }
      if (to === "CANCELLED") await releaseVoucherIfAllCancelled(tx, item.orderId);
    })
    .catch((e) => {
      if (e instanceof Error && e.message === "CHANGED") {
        changed = true;
        return;
      }
      throw e;
    });

  if (!changed && actor !== "CUSTOMER") await notifyCustomerItem(item.id, to);
  return NextResponse.json({ ok: true });
}
