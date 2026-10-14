// Prices are stored in the smallest unit (cents). Set these in .env to change the currency.
// PayHere card payments support LKR and USD only.
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY_LABEL ?? "Rs";
export const CURRENCY_CODE = process.env.NEXT_PUBLIC_CURRENCY_CODE ?? "LKR";

export function money(cents: number) {
  return `${CURRENCY} ${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function discountPct(price: number, original?: number | null) {
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}
