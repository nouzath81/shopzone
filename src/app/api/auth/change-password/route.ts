import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser, setSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clearAttempts, isLimited, MINUTE, recordAttempt } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const current = String(b?.current ?? "");
  const next = String(b?.password ?? "");
  if (next.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });

  // Someone on a borrowed, logged-in device must not be able to guess the current password in bulk.
  const key = `chpw:${user.id}`;
  if (await isLimited(key, 5, 15 * MINUTE)) {
    return NextResponse.json({ error: "Too many attempts. Please wait 15 minutes and try again." }, { status: 429 });
  }
  if (!verifyPassword(current, user.passwordHash)) {
    await recordAttempt(key);
    return NextResponse.json({ error: "Your current password is not correct" }, { status: 400 });
  }
  if (current === next) return NextResponse.json({ error: "Choose a password you have not used just now" }, { status: 400 });

  // Raising the version signs out every other device; this device gets a fresh cookie so the user stays logged in.
  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(next), sessionVersion: { increment: 1 } },
  });
  setSession(updated.id, updated.sessionVersion);
  await clearAttempts(key);
  return NextResponse.json({ ok: true });
}
