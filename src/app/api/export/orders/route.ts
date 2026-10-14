import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const TZ = process.env.SHOP_TIMEZONE ?? "Asia/Colombo";
const day = (d: Date | null) => (d ? d.toLocaleDateString("en-CA", { timeZone: TZ }) : "");
const rs = (cents: number) => (cents / 100).toFixed(2);

/**
 * Download order lines as a spreadsheet file (CSV).
 * A seller gets their own lines only; an admin gets every seller's. ?days=7|30|90|365 (default 30).
 */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && !user.seller) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const n = Number(new URL(req.url).searchParams.get("days"));
  const days = [7, 30, 90, 365].includes(n) ? n : 30;
  const since = new Date(Date.now() - days * 86_400_000);

  const items = await db.orderItem.findMany({
    where: { order: { createdAt: { gte: since } }, ...(isAdmin ? {} : { product: { sellerId: user.seller!.id } }) },
    orderBy: { order: { createdAt: "desc" } },
    take: 5000,
    include: { product: { include: { seller: true } }, order: true, returnRequest: true },
  });

  const header = ["Order", "Date", "Seller", "Product", "Variant", "Qty", "Unit price", "Line total", "Status", "Payment", "Paid", "Commission %", "Commission", "Customer", "Phone", "City", "Tracking", "Shipped", "Delivered", "Return"];
  const rows = items.map((i) => {
    const line = i.price * i.quantity;
    return [
      i.orderId.slice(-8).toUpperCase(),
      day(i.order.createdAt),
      i.product.seller.shopName,
      i.product.title,
      i.variantName ?? "",
      i.quantity,
      rs(i.price),
      rs(line),
      i.status,
      i.order.payment,
      i.order.payment === "CARD" ? (i.order.paid ? "yes" : "no") : "",
      i.commissionPct,
      rs(Math.round((line * i.commissionPct) / 100)),
      i.order.name,
      i.order.phone,
      i.order.city,
      i.trackingNo ?? "",
      day(i.shippedAt),
      day(i.deliveredAt),
      i.returnRequest?.status ?? "",
    ];
  });

  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shopzone-orders-${days}d.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
