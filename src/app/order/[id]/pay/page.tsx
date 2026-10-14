import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CURRENCY_CODE } from "@/lib/format";
import { checkoutHash, currencySupported, formatAmount, payhereConfig } from "@/lib/payhere";
import PayHereRedirect from "@/components/PayHereRedirect";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/order/${params.id}/pay`);
  const order = await db.order.findUnique({ where: { id: params.id }, include: { items: { include: { product: true } } } });
  if (!order || order.userId !== user.id) notFound();
  if (order.payment !== "CARD" || order.paid) redirect(`/order/${order.id}`);

  const cfg = payhereConfig();
  if (!cfg || !currencySupported()) {
    return (
      <section className="section">
        <div className="empty">
          Card payments are not set up on this shop. <Link href={`/order/${order.id}`} style={{ color: "var(--brand)" }}>Back to order</Link>
        </div>
      </section>
    );
  }

  // The card amount covers the whole order, so an order with cancelled items can't be paid any more.
  if (order.items.some((i) => i.status === "CANCELLED")) {
    return (
      <section className="section">
        <div className="empty">
          This order has cancelled items, so it can&apos;t be paid online. Please place a new order.{" "}
          <Link href="/" style={{ color: "var(--brand)" }}>Continue shopping</Link>
        </div>
      </section>
    );
  }

  const amount = formatAmount(order.total);
  const [firstName, ...rest] = user.name.trim().split(/\s+/);

  const fields: Record<string, string> = {
    merchant_id: cfg.merchantId,
    return_url: `${cfg.siteUrl}/order/${order.id}?placed=1`,
    cancel_url: `${cfg.siteUrl}/order/${order.id}`,
    notify_url: `${cfg.siteUrl}/api/payhere/notify`,
    order_id: order.id,
    items: order.items.map((i) => i.product.title).join(", ").slice(0, 200),
    currency: CURRENCY_CODE,
    amount,
    first_name: firstName,
    last_name: rest.join(" ") || "-",
    email: user.email,
    phone: order.phone,
    address: order.address,
    city: order.city,
    country: "Sri Lanka",
    hash: checkoutHash(cfg.merchantId, cfg.secret, order.id, amount, CURRENCY_CODE),
  };

  return (
    <section className="section">
      <div className="pad" style={{ textAlign: "center" }}>
        {cfg.sandbox && <p style={{ color: "var(--red)", marginBottom: 8 }}>TEST MODE: no real money is taken.</p>}
        <PayHereRedirect action={cfg.action} fields={fields} />
      </div>
    </section>
  );
}
