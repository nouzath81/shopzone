import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import StatusButtons from "@/components/StatusButtons";
import ReviewForm from "@/components/ReviewForm";
import Timeline from "@/components/Timeline";
import { ReturnForm } from "@/components/ReturnForms";
import { RETURN_DAYS, withinReturnWindow } from "@/lib/returns";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: { id: string }; searchParams: { placed?: string } }) {
  const user = await requireUser(`/order/${params.id}`);
  const order = await db.order.findUnique({
    where: { id: params.id },
    include: { items: { include: { review: true, returnRequest: true, product: { include: { seller: true } } } } },
  });
  // Only the buyer (or an admin) can see an order. Everyone else gets a 404.
  if (!order || (order.userId !== user.id && user.role !== "ADMIN")) notFound();

  const who = user.role === "ADMIN" ? "ADMIN" : "CUSTOMER";

  return (
    <section className="section">
      <div className="pad" style={{ textAlign: "center" }}>
        {searchParams.placed ? (
          <>
            <div style={{ fontSize: 44 }}>✅</div>
            <h2 className="ok" style={{ marginTop: 8 }}>Order placed!</h2>
          </>
        ) : (
          <h2>Order details</h2>
        )}
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          Order no. {order.id} · {order.createdAt.toLocaleDateString("en-GB")}
        </p>
      </div>
      {order.payment === "CARD" && !order.paid && !order.items.some((i) => i.status === "CANCELLED") && order.userId === user.id && (
        <div className="pad" style={{ background: "var(--brand-soft)", textAlign: "center" }}>
          {searchParams.placed ? (
            <p style={{ marginBottom: 8 }}>We are confirming your payment with PayHere. Refresh this page in a moment.</p>
          ) : (
            <p style={{ marginBottom: 8 }}>This order is waiting for your card payment.</p>
          )}
          <Link href={`/order/${order.id}/pay`} className="btn-primary" style={{ display: "inline-block" }}>Pay now</Link>
        </div>
      )}
      {order.items.map((i) => (
        <div className="line" key={i.id} style={{ gridTemplateColumns: "80px 1fr auto auto" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={i.product.images[0]} alt={i.product.title} />
          <div>
            <Link href={`/product/${i.productId}`}>{i.product.title}</Link>{i.variantName && <span style={{ color: "var(--muted)" }}> · {i.variantName}</span>}
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
              Sold by {i.product.seller.shopName} · Qty {i.quantity}
            </div>
            <div style={{ marginTop: 6 }}>
              <span className={`badge ${i.status}`}>{i.status}</span>
            </div>
            <Timeline status={i.status} orderedAt={order.createdAt} shippedAt={i.shippedAt} deliveredAt={i.deliveredAt} trackingNo={i.trackingNo} />
          </div>
          <div className="price">{money(i.price * i.quantity)}</div>
          <div>
            <StatusButtons id={i.id} status={i.status} who={who} canCancel={!order.paid} />
            {who === "CUSTOMER" && i.status === "DELIVERED" &&
              (i.review ? (
                <span className="stars" title="Your review">{"★".repeat(i.review.rating)}{"☆".repeat(5 - i.review.rating)}</span>
              ) : (
                <ReviewForm orderItemId={i.id} />
              ))}
            {who === "CUSTOMER" && i.status === "DELIVERED" && !i.returnRequest && withinReturnWindow(i.deliveredAt) && (
              <ReturnForm orderItemId={i.id} />
            )}
            {i.returnRequest && (
              <div style={{ fontSize: 12, marginTop: 6, maxWidth: 220 }}>
                <span className={`badge ${i.returnRequest.status === "REJECTED" ? "CANCELLED" : i.returnRequest.status === "REFUNDED" ? "DELIVERED" : "PENDING"}`}>
                  Return {i.returnRequest.status.toLowerCase()}
                </span>
                {i.returnRequest.status !== "REJECTED" && i.returnRequest.status !== "REQUESTED" && (
                  <div style={{ marginTop: 4 }}>Refund: {money(i.returnRequest.refundAmount)}</div>
                )}
                {i.returnRequest.note && <div style={{ color: "var(--muted)", marginTop: 4 }}>Reply: {i.returnRequest.note}</div>}
              </div>
            )}
          </div>
        </div>
      ))}
      <div className="pad">
        <p><strong>Deliver to:</strong> {order.name}, {order.phone}</p>
        <p>{order.address}, {order.city}</p>
        <p style={{ marginTop: 6 }}><strong>Payment:</strong> {order.payment === "COD" ? "Cash on Delivery" : order.paid ? "Paid online ✓" : "Card: waiting for payment"}</p>
        {order.shipping > 0 && (
          <p style={{ marginTop: 6 }}>Shipping: {money(order.shipping)}</p>
        )}
        {order.discount > 0 && (
          <p className="ok" style={{ marginTop: 6 }}>Voucher {order.voucherCode}: −{money(order.discount)}</p>
        )}
        <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>Delivered items can be returned within {RETURN_DAYS} days. Shipping is not refunded.</p>
        <p className="price" style={{ marginTop: 10 }}>Total {money(order.total)}</p>
        <Link href="/account/orders" className="btn-ghost" style={{ display: "inline-block", marginTop: 16, marginRight: 8 }}>My Orders</Link>
        <Link href="/" className="btn-primary" style={{ display: "inline-block", marginTop: 16 }}>Continue Shopping</Link>
      </div>
    </section>
  );
}
