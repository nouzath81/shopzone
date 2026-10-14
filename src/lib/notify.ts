import { db } from "./db";
import { button, emailLayout, esc, sendMail, siteUrl } from "./mail";
import { money } from "./format";

/**
 * Event emails. Every function swallows its own errors: a mail problem must never break an order,
 * a status change or a return. Without RESEND_API_KEY nothing is sent.
 */
async function safe(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    console.error(`${label} email failed:`, e);
  }
}

const short = (id: string) => id.slice(-8).toUpperCase();

/** Tells each seller about the items they must ship in a new order. */
export function notifySellersNewOrder(orderId: string) {
  return safe("New-order", async () => {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: { include: { seller: { include: { user: true } } } } } } },
    });
    if (!order) return;
    const bySeller = new Map<string, { email: string; shop: string; rows: string[] }>();
    for (const i of order.items) {
      const s = i.product.seller;
      const g = bySeller.get(s.id) ?? { email: s.user.email, shop: s.shopName, rows: [] };
      g.rows.push(`<tr><td style="padding:6px 0">${esc(i.product.title)}${i.variantName ? ` (${esc(i.variantName)})` : ""} × ${i.quantity}</td><td style="padding:6px 0;text-align:right">${esc(money(i.price * i.quantity))}</td></tr>`);
      bySeller.set(s.id, g);
    }
    const unpaid = order.payment === "CARD" && !order.paid;
    for (const g of bySeller.values()) {
      await sendMail({
        to: g.email,
        subject: `New order #${short(order.id)} for ${g.shop}`,
        html: emailLayout(
          "You have a new order",
          `<table style="width:100%;border-collapse:collapse;border-top:1px solid #e8e8e8">${g.rows.join("")}</table>
           <p style="margin-top:12px"><strong>Deliver to:</strong> ${esc(order.city)}</p>
           <p>${unpaid ? "The customer is paying by card. Wait until the order shows as paid before shipping." : order.payment === "COD" ? "Cash on delivery." : "Paid by card."}</p>
           ${button(`${siteUrl()}/seller/orders`, "Open Seller Centre")}`,
        ),
      });
    }
  });
}

/** Tells the customer when an item is shipped, delivered or cancelled by the seller or an admin. */
export function notifyCustomerItem(itemId: string, status: string) {
  return safe("Item-status", async () => {
    if (!["SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) return;
    const item = await db.orderItem.findUnique({ where: { id: itemId }, include: { product: true, order: { include: { user: true } } } });
    if (!item) return;
    const text =
      status === "SHIPPED"
        ? `is on its way${item.trackingNo ? `. Courier / tracking: <strong>${esc(item.trackingNo)}</strong>` : "."}`
        : status === "DELIVERED"
          ? "has been delivered. You can rate it and, within 7 days, return it from your order page."
          : "was cancelled.";
    await sendMail({
      to: item.order.user.email,
      subject: `Order #${short(item.orderId)}: ${status.toLowerCase()}`,
      html: emailLayout(
        `Your item ${status.toLowerCase()}`,
        `<p>${esc(item.product.title)}${item.variantName ? ` (${esc(item.variantName)})` : ""} × ${item.quantity} ${text}</p>${button(`${siteUrl()}/order/${item.orderId}`, "View your order")}`,
      ),
    });
  });
}

/** New return request → the seller. Decision or refund → the customer. */
export function notifyReturn(returnId: string, event: "requested" | "approved" | "rejected" | "refunded") {
  return safe("Return", async () => {
    const r = await db.returnRequest.findUnique({
      where: { id: returnId },
      include: { user: true, orderItem: { include: { product: { include: { seller: { include: { user: true } } } } } } },
    });
    if (!r) return;
    const title = esc(r.orderItem.product.title);
    if (event === "requested") {
      await sendMail({
        to: r.orderItem.product.seller.user.email,
        subject: `Return request for ${r.orderItem.product.title}`,
        html: emailLayout("A customer wants to return an item", `<p>${title}</p><p><em>${esc(r.reason)}</em></p>${button(`${siteUrl()}/seller/returns`, "Review the request")}`),
      });
      return;
    }
    const msg =
      event === "approved" ? `Your return was approved. Refund: ${esc(money(r.refundAmount))}.`
      : event === "rejected" ? "Your return request was not approved."
      : `Your refund of ${esc(money(r.refundAmount))} has been sent.`;
    await sendMail({
      to: r.user.email,
      subject: `Return update: ${event}`,
      html: emailLayout("Return update", `<p>${title}</p><p>${msg}</p>${r.note ? `<p>Message from the shop: ${esc(r.note)}</p>` : ""}${button(`${siteUrl()}/order/${r.orderItem.orderId}`, "View your order")}`),
    });
  });
}

/** New question → the seller. Answer → the shopper who asked. */
export function notifyQuestion(questionId: string, event: "asked" | "answered") {
  return safe("Question", async () => {
    const q = await db.question.findUnique({
      where: { id: questionId },
      include: { user: true, product: { include: { seller: { include: { user: true } } } } },
    });
    if (!q) return;
    const title = esc(q.product.title);
    if (event === "asked") {
      await sendMail({
        to: q.product.seller.user.email,
        subject: `A shopper asked about ${q.product.title}`,
        html: emailLayout("New question", `<p>${title}</p><p><em>${esc(q.text)}</em></p>${button(`${siteUrl()}/seller/questions`, "Answer it")}`),
      });
      return;
    }
    await sendMail({
      to: q.user.email,
      subject: `Your question about ${q.product.title} was answered`,
      html: emailLayout("The seller replied", `<p>${title}</p><p><em>${esc(q.text)}</em></p><p>${esc(q.answer ?? "")}</p>${button(`${siteUrl()}/product/${q.productId}`, "View the product")}`),
    });
  });
}
