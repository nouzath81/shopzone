import { createHash, timingSafeEqual } from "crypto";
import { CURRENCY_CODE } from "./format";

const md5Upper = (s: string) => createHash("md5").update(s).digest("hex").toUpperCase();

export function payhereConfig() {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const secret = process.env.PAYHERE_MERCHANT_SECRET;
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  const sandbox = process.env.PAYHERE_SANDBOX !== "false"; // sandbox unless you explicitly turn it off
  if (!merchantId || !secret || !siteUrl) return null;
  return {
    merchantId,
    secret,
    siteUrl,
    sandbox,
    action: sandbox ? "https://sandbox.payhere.lk/pay/checkout" : "https://www.payhere.lk/pay/checkout",
  };
}

/** PayHere wants the amount with exactly two decimals and no thousands separator, e.g. "1500.00". */
export const formatAmount = (cents: number) => (cents / 100).toFixed(2);

/** PayHere only accepts these currencies on the checkout form. */
export const currencySupported = () => CURRENCY_CODE === "LKR" || CURRENCY_CODE === "USD";

export function checkoutHash(merchantId: string, secret: string, orderId: string, amount: string, currency: string) {
  return md5Upper(merchantId + orderId + amount + currency + md5Upper(secret));
}

/** Checks the md5sig PayHere sends with its server-to-server notification. */
export function verifyNotification(
  secret: string,
  f: { merchant_id: string; order_id: string; payhere_amount: string; payhere_currency: string; status_code: string; md5sig: string },
) {
  const expected = md5Upper(f.merchant_id + f.order_id + f.payhere_amount + f.payhere_currency + f.status_code + md5Upper(secret));
  const a = Buffer.from(expected);
  const b = Buffer.from(String(f.md5sig).toUpperCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
