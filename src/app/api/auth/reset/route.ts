import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { clientIp, isLimited, MINUTE, recordAttempt } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const token = String(b?.token ?? "");
  const password = String(b?.password ?? "");

  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: "This reset link is not valid" }, { status: 400 });

  // Stops someone from guessing tokens in bulk.
  const key = `reset:${clientIp()}`;
  if (await isLimited(key, 20, 15 * MINUTE)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  await recordAttempt(key);

  const reset = await db.passwordReset.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") } });
  if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This reset link has expired or was already used. Please request a new one." }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    // Mark as used first, matching on "not used yet", so the same link can't be used twice at the same moment.
    const claimed = await tx.passwordReset.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count === 0) throw new Error("USED");
    // A new password signs out every device. The reset link came from the inbox, so it also proves the email is real.
    await tx.user.update({
      where: { id: reset.userId },
      data: { passwordHash: hashPassword(password), sessionVersion: { increment: 1 }, emailVerified: new Date() },
    });
    await tx.passwordReset.deleteMany({ where: { userId: reset.userId, id: { not: reset.id } } });
  }).catch((e) => {
    if (e instanceof Error && e.message === "USED") return;
    throw e;
  });

  return NextResponse.json({ ok: true });
}
