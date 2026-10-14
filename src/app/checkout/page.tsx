import CheckoutForm from "@/components/CheckoutForm";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { needsVerification } from "@/lib/verify";
import { currencySupported, payhereConfig } from "@/lib/payhere";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  if (needsVerification(user)) {
    return (
      <section className="section">
        <div className="empty">
          Please confirm your email address ({user.email}) before placing an order. We sent you a link: use it, or press
          &ldquo;Resend the email&rdquo; in the bar at the top. Then{" "}
          <Link href="/checkout" style={{ color: "var(--brand)" }}>try again</Link>.
        </div>
      </section>
    );
  }
  const saved = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  const addresses = saved.map(({ id, name, phone, address, city, isDefault }) => ({ id, name, phone, address, city, isDefault }));
  return <CheckoutForm defaultName={user.name} addresses={addresses} cardEnabled={!!payhereConfig() && currencySupported()} />;
}
