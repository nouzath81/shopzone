import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENCY_CODE } from "@/lib/format";
import { payhereConfig, verifyNotification } from "@/lib/payhere";

/**
 * PayHere calls this URL from its servers after every payment attempt.
 * This is the ONLY place an order is marked paid (the customer's browser is never trusted).
 */
export async function POST(req: Request) {
  const cfg = payhereConfig();
  if (!cfg) return new NextResponse("not configured", { status: 503 });

  const form = await req.formData().catch(() => null);
  if (!form) return new NextResponse("bad request", { status: 400 });
  const get = (k: string) => String(form.get(k) ?? "");

  const f = {
    merchant_id: get("merchant_id"),
    order_id: get("order_id"),
    payment_id: get("payment_id"),
    payhere_amount: get("payhere_amount"),
    payhere_currency: get("payhere_currency"),
    status_code: get("status_code"),
    md5sig: get("md5sig"),
  };

  if (f.merchant_id !== cfg.merchantId || !verifyNotification(cfg.secret, f)) {
    return new NextResponse("invalid signature", { status: 400 });
  }

  // Only a successful payment (status 2) matters here. Pending / cancelled / failed leave the order unpaid,
  // so the customer can try again from the order page.
  if (f.status_code !== "2") return new NextResponse("ok");

  const order = await db.order.findUnique({ where: { id: f.order_id } });
  if (!order || order.payment !== "CARD") return new NextResponse("unknown order", { status: 404 });

  // The amount and currency must match what we asked for.
  if (Math.round(parseFloat(f.payhere_amount) * 100) !== order.total || f.payhere_currency !== CURRENCY_CODE) {
    console.error("PayHere amount mismatch", { order: order.id, got: f.payhere_amount, currency: f.payhere_currency });
    return new NextResponse("amount mismatch", { status: 400 });
  }

  // Idempotent: PayHere may call more than once.
  await db.order.updateMany({
    where: { id: order.id, paid: false },
    data: { paid: true, paidAt: new Date(), paymentRef: f.payment_id },
  });
  return new NextResponse("ok");
}
