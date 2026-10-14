import type { Voucher } from "@prisma/client";
import { money } from "./format";

/** Returns an error message if the voucher can't be used for this subtotal, otherwise null. */
export function voucherError(v: Voucher | null, subtotal: number): string | null {
  if (!v || !v.active) return "That voucher code is not valid";
  if (v.expiresAt && v.expiresAt.getTime() < Date.now()) return "That voucher has expired";
  if (v.maxUses !== null && v.used >= v.maxUses) return "That voucher has been fully used";
  if (subtotal < v.minSpend) return `Spend at least ${money(v.minSpend)} to use this voucher`;
  return null;
}

/** Discount in cents, never more than the subtotal. */
export function voucherDiscount(v: Voucher, subtotal: number): number {
  const raw = v.percentOff ? Math.floor((subtotal * v.percentOff) / 100) : (v.amountOff ?? 0);
  return Math.max(0, Math.min(raw, subtotal));
}

export const normalizeCode = (c: unknown) => String(c ?? "").trim().toUpperCase();
