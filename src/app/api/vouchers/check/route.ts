import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { visible } from "@/lib/visible";
import { normalizeCode, voucherDiscount, voucherError } from "@/lib/voucher";

export async function POST(req: Request) {
  if (!(await getUser())) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const code = normalizeCode(b?.code);
  const items: { id: string; quantity: number }[] = Array.isArray(b?.items) ? b.items : [];
  if (!code || items.length === 0) return NextResponse.json({ error: "Enter a voucher code" }, { status: 400 });

  // The subtotal is recalculated from the database, never taken from the browser.
  const products = await db.product.findMany({ where: { id: { in: items.map((i) => i.id) }, ...visible } });
  const price = new Map(products.map((p) => [p.id, p.price]));
  let subtotal = 0;
  for (const i of items) subtotal += (price.get(i.id) ?? 0) * Math.max(0, Math.floor(Number(i.quantity)) || 0);

  const voucher = await db.voucher.findUnique({ where: { code } });
  const err = voucherError(voucher, subtotal);
  if (err || !voucher) return NextResponse.json({ error: err ?? "That voucher code is not valid" }, { status: 400 });

  return NextResponse.json({ code: voucher.code, discount: voucherDiscount(voucher, subtotal) });
}
