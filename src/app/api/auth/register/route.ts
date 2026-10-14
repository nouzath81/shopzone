import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { setSession } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/verify";
import { clientIp, isLimited, MINUTE, recordAttempt } from "@/lib/rateLimit";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "shop";
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  const isSeller = b?.role === "SELLER";
  const shopName = String(b?.shopName ?? "").trim();

  // At most 10 sign-up attempts per address per hour.
  const regKey = `reg:${clientIp()}`;
  if (await isLimited(regKey, 10, 60 * MINUTE)) {
    return NextResponse.json({ error: "Too many sign-ups from your network. Try again later." }, { status: 429 });
  }
  await recordAttempt(regKey);

  if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter your name and a valid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (isSeller && !shopName) {
    return NextResponse.json({ error: "Enter your shop name" }, { status: 400 });
  }
  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "That email is already registered" }, { status: 409 });
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role: isSeller ? "SELLER" : "CUSTOMER",
      ...(isSeller
        ? { seller: { create: { shopName, slug: `${slugify(shopName)}-${randomBytes(2).toString("hex")}` } } }
        : {}),
    },
  });

  setSession(user.id, user.sessionVersion);

  // Ask the new user to confirm their email. A mail problem must never block sign-up.
  try {
    await sendVerificationEmail(user);
  } catch (e) {
    console.error("Verification email failed:", e);
  }
  return NextResponse.json({ role: user.role });
}
