import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { visible } from "@/lib/visible";
import { normalizeCode, voucherDiscount, voucherError } from "@/lib/voucher";
import { currencySupported, payhereConfig } from "@/lib/payhere";
import { shippingFor } from "@/lib/shipping";
import { button, emailLayout, esc, sendMail, siteUrl } from "@/lib/mail";
import { money } from "@/lib/format";
import { needsVerification } from "@/lib/verify";
import { notifySellersNewOrder } from "@/lib/notify";
import type { Voucher } from "@prisma/client";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in to place an order" }, { status: 401 });
  if (needsVerification(user)) {
    return NextResponse.json({ error: "Please confirm your email address first. We sent you a link." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { name, phone, address, city, payment, items, voucher: voucherCode } = body as {
    voucher?: string;
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    payment?: string;
    items?: { id: string; variantId?: string; quantity: number }[];
  };

  if (!name || !phone || !address || !city || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Please fill in all fields" }, { status: 400 });
  }

  const wantsCard = payment === "CARD";
  if (wantsCard && (!payhereConfig() || !currencySupported())) {
    return NextResponse.json({ error: "Card payments are not available right now. Please choose Cash on Delivery." }, { status: 400 });
  }

  // Prices always come from the database, never from the browser.
  const products = await db.product.findMany({ where: { id: { in: items.map((i) => i.id) }, ...visible }, include: { seller: true, variants: true } });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Merge duplicate lines so stock is checked against the full quantity.
  // A line is a product plus, when the product has variants, the chosen variant.
  const wanted = new Map<string, { id: string; variantId: string | null; qty: number }>();
  for (const i of items) {
    const qty = Math.floor(Number(i.quantity));
    if (!(qty > 0)) return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    const variantId = typeof i.variantId === "string" && i.variantId ? i.variantId : null;
    const k = `${i.id}|${variantId ?? ""}`;
    const w = wanted.get(k) ?? { id: i.id, variantId, qty: 0 };
    w.qty += qty;
    wanted.set(k, w);
  }

  let total = 0; // goods total, before voucher and shipping
  const sellerSubtotals = new Map<string, number>();
  const sellerWeights = new Map<string, number>(); // grams per seller, for weight-based shipping
  const orderItems: { productId: string; quantity: number; price: number; commissionPct: number; variantId: string | null; variantName: string | null }[] = [];
  for (const { id, variantId, qty } of wanted.values()) {
    const p = byId.get(id);
    if (!p) return NextResponse.json({ error: "A product in your cart is no longer available" }, { status: 400 });
    // Products with variants need a valid choice; products without must not have one.
    const variant = variantId ? p.variants.find((v) => v.id === variantId) : undefined;
    if (p.variants.length > 0 && !variant) {
      return NextResponse.json({ error: `Please choose an option for "${p.title}" again (it may have changed)` }, { status: 400 });
    }
    if (p.variants.length === 0 && variantId) return NextResponse.json({ error: `"${p.title}" has changed. Please add it to your cart again.` }, { status: 400 });
    const have = variant ? variant.stock : p.stock;
    if (have < qty) return NextResponse.json({ error: `Not enough stock for "${p.title}"${variant ? ` (${variant.name})` : ""}` }, { status: 400 });
    total += p.price * qty;
    sellerSubtotals.set(p.sellerId, (sellerSubtotals.get(p.sellerId) ?? 0) + p.price * qty);
    sellerWeights.set(p.sellerId, (sellerWeights.get(p.sellerId) ?? 0) + p.weightGrams * qty);
    orderItems.push({ productId: p.id, quantity: qty, price: p.price, commissionPct: p.seller.commissionPct, variantId: variant?.id ?? null, variantName: variant?.name ?? null });
  }

  // Optional voucher: re-validated here, the browser's idea of the discount is ignored.
  const code = normalizeCode(voucherCode);
  let applied: Voucher | null = null;
  let discount = 0;
  if (code) {
    const v = await db.voucher.findUnique({ where: { code } });
    const err = voucherError(v, total);
    if (err || !v) return NextResponse.json({ error: err ?? "That voucher code is not valid" }, { status: 400 });
    applied = v;
    discount = voucherDiscount(v, total);
  }
  const voucher = applied;

  // Shipping per seller, always recalculated here from the seller settings in the database.
  const { total: shipping } = shippingFor(sellerSubtotals, new Map(products.map((p) => [p.sellerId, p.seller])), city, sellerWeights);

  try {
    const order = await db.$transaction(async (tx) => {
      if (voucher) {
        // Capped vouchers: matching on the `used` count we read stops two orders from sneaking past maxUses together.
        // Uncapped vouchers: just count the use, so busy shops don't get false "used up" errors.
        const r = await tx.voucher.updateMany({
          where: voucher.maxUses !== null ? { id: voucher.id, used: voucher.used } : { id: voucher.id },
          data: { used: { increment: 1 } },
        });
        if (r.count === 0) throw new Error("VOUCHER");
      }
      for (const i of orderItems) {
        // Conditional updates: fail (count 0) if someone else bought the last units meanwhile.
        if (i.variantId) {
          const v = await tx.productVariant.updateMany({ where: { id: i.variantId, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
          if (v.count === 0) throw new Error("STOCK");
        }
        const res = await tx.product.updateMany({
          where: { id: i.productId, stock: { gte: i.quantity } },
          data: { stock: { decrement: i.quantity }, sold: { increment: i.quantity } },
        });
        if (res.count === 0) throw new Error("STOCK");
      }
      return tx.order.create({
        data: {
          userId: user.id,
          name,
          phone,
          address,
          city,
          payment: wantsCard ? "CARD" : "COD",
          discount,
          voucherCode: voucher?.code ?? null,
          shipping,
          total: total - discount + shipping,
          items: { create: orderItems },
        },
      });
    });

    // Confirmation email. A mail problem must never stop the order, so errors are swallowed.
    try {
      const rows = orderItems
        .map((i) => {
          const title = (byId.get(i.productId)?.title ?? "Item") + (i.variantName ? ` (${i.variantName})` : "");
          return `<tr><td style="padding:6px 0">${esc(title)} × ${i.quantity}</td><td style="padding:6px 0;text-align:right">${esc(money(i.price * i.quantity))}</td></tr>`;
        })
        .join("");
      const extra = (label: string, value: string) =>
        `<tr><td style="padding:4px 0;color:#757575">${esc(label)}</td><td style="padding:4px 0;text-align:right">${esc(value)}</td></tr>`;
      await sendMail({
        to: user.email,
        subject: `Your ShopZone order #${order.id.slice(-8).toUpperCase()}`,
        html: emailLayout(
          "Thank you for your order!",
          `<p>Hi ${esc(user.name)}, we have received your order.</p>
           <table style="width:100%;border-collapse:collapse;border-top:1px solid #e8e8e8;margin-top:12px">${rows}
             ${shipping > 0 ? extra("Shipping", money(shipping)) : ""}
             ${discount > 0 ? extra(`Voucher ${voucher?.code ?? ""}`, `−${money(discount)}`) : ""}
             <tr><td style="padding:8px 0;border-top:1px solid #e8e8e8"><strong>Total</strong></td><td style="padding:8px 0;border-top:1px solid #e8e8e8;text-align:right"><strong>${esc(money(total - discount + shipping))}</strong></td></tr>
           </table>
           <p style="margin-top:12px"><strong>Deliver to:</strong><br>${esc(name)}, ${esc(phone)}<br>${esc(address)}, ${esc(city)}</p>
           <p><strong>Payment:</strong> ${wantsCard ? "Card (please complete your payment)" : "Cash on delivery"}</p>
           ${button(`${siteUrl()}${wantsCard ? `/order/${order.id}/pay` : `/order/${order.id}`}`, wantsCard ? "Pay now" : "View your order")}`,
        ),
      });
    } catch (e) {
      console.error("Order email failed:", e);
    }

    await notifySellersNewOrder(order.id);
    return NextResponse.json({ id: order.id, card: wantsCard });
  } catch (e) {
    if (e instanceof Error && e.message === "STOCK") {
      return NextResponse.json({ error: "Sorry, an item just sold out. Please review your cart." }, { status: 409 });
    }
    if (e instanceof Error && e.message === "VOUCHER") {
      return NextResponse.json({ error: "That voucher was just used up. Please remove it and try again." }, { status: 409 });
    }
    throw e;
  }
}
