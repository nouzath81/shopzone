export const MAX_ADDRESSES = 10;

/** Cleans address input from the browser. Returns null if something is missing. */
export function cleanAddress(b: unknown) {
  const o = (b ?? {}) as Record<string, unknown>;
  const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const a = { name: s(o.name, 80), phone: s(o.phone, 30), address: s(o.address, 300), city: s(o.city, 60) };
  return a.name && a.phone && a.address && a.city ? a : null;
}
