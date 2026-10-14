import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "./db";

const COOKIE = "sz_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (16+ characters)");
    return "dev-only-secret-change-me";
  }
  return s;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

// Token = userId.version.expiry.signature. The version must match User.sessionVersion,
// so raising that number in the database signs the user out everywhere at once.
function makeToken(userId: string, version: number) {
  const payload = `${userId}.${version}.${Date.now() + MAX_AGE * 1000}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string): { id: string; version: number } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [id, version, exp, sig] = parts;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(`${id}.${version}.${exp}`));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  const v = Number(version);
  if (!Number.isInteger(v)) return null;
  return { id, version: v };
}

export function setSession(userId: string, version: number) {
  cookies().set(COOKIE, makeToken(userId, version), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSession() {
  cookies().delete(COOKIE);
}

/** The logged-in user (with seller profile), or null. Cached per request. */
export const getUser = cache(async () => {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const t = readToken(token);
  if (!t) return null;
  const user = await db.user.findUnique({ where: { id: t.id }, include: { seller: true } });
  if (!user || user.sessionVersion !== t.version) return null;
  return user;
});

/** Only allow redirects to paths on this site. */
export function safeNext(next?: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function requireUser(nextPath = "/") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

export async function requireSeller() {
  const user = await requireUser("/seller");
  if (user.role !== "SELLER" || !user.seller) redirect("/");
  return { user, seller: user.seller };
}
