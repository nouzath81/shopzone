export type Zone = { city: string; fee: number }; // fee in cents, 0 = free

export type ShipSeller = {
  id: string;
  shopName: string;
  shippingFee: number;
  freeShippingOver: number | null;
  shippingPerKg?: number; // extra cents for every started kg after the first
  shippingZones?: unknown; // JSON array of Zone, stored on the seller
};

export type ShipPart = { shopName: string; fee: number; free: boolean };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Reads the stored JSON safely: bad rows are dropped instead of breaking checkout. */
export function parseZones(raw: unknown): Zone[] {
  if (!Array.isArray(raw)) return [];
  const out: Zone[] = [];
  for (const z of raw) {
    const city = typeof z?.city === "string" ? z.city.trim().slice(0, 60) : "";
    const fee = Number(z?.fee);
    if (city && Number.isInteger(fee) && fee >= 0) out.push({ city, fee });
  }
  return out.slice(0, 50);
}

/**
 * Shipping is worked out per seller (each seller ships their own parcel):
 * the fee for the customer's city if the seller set one, otherwise the seller's usual fee,
 * plus, if the seller set a per-kg fee, that fee for every started kg after the first kg of their parcel;
 * all free when the goods from that seller reach their "free shipping over" amount.
 * `sellerSubtotals` maps seller id -> goods total (cents) in this order.
 * `sellerWeights` maps seller id -> parcel weight in grams (products without a weight count as 0).
 */
export function extraKgs(grams: number) {
  return Math.max(0, Math.ceil(grams / 1000) - 1);
}

export function shippingFor(
  sellerSubtotals: Map<string, number>,
  sellers: Map<string, ShipSeller>,
  city = "",
  sellerWeights: Map<string, number> = new Map(),
) {
  let total = 0;
  const parts: ShipPart[] = [];
  const wanted = norm(city);
  for (const [id, subtotal] of sellerSubtotals) {
    const s = sellers.get(id);
    if (!s) continue;
    const zone = wanted ? parseZones(s.shippingZones).find((z) => norm(z.city) === wanted) : undefined;
    const base = zone ? zone.fee : s.shippingFee;
    const raw = base + (s.shippingPerKg ?? 0) * extraKgs(sellerWeights.get(id) ?? 0);
    const free = raw === 0 || (s.freeShippingOver !== null && subtotal >= s.freeShippingOver);
    const fee = free ? 0 : raw;
    total += fee;
    parts.push({ shopName: s.shopName, fee, free });
  }
  return { total, parts };
}
