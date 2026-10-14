import { headers } from "next/headers";
import { db } from "./db";

/** Best-effort client address. Behind Vercel/most hosts the first x-forwarded-for entry is the visitor. */
export function clientIp() {
  const h = headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export const MINUTE = 60 * 1000;

/** True when `key` already has `max` or more recorded attempts inside the window. */
export async function isLimited(key: string, max: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs);
  const n = await db.loginAttempt.count({ where: { key, createdAt: { gte: since } } });
  return n >= max;
}

export async function recordAttempt(...keys: string[]) {
  await db.loginAttempt.createMany({ data: keys.map((key) => ({ key })) });
  // Tidy old rows now and then so the table stays small.
  if (Math.random() < 0.02) {
    await db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * MINUTE) } } });
  }
}

export async function clearAttempts(key: string) {
  await db.loginAttempt.deleteMany({ where: { key } });
}
