import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { setSession } from "@/lib/auth";
import { clearAttempts, clientIp, isLimited, MINUTE, recordAttempt } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");

  // 5 wrong tries per email+address, or 30 per address, in 15 minutes.
  const ip = clientIp();
  const perAccount = `login:${ip}:${email}`;
  const perIp = `loginip:${ip}`;
  if ((await isLimited(perAccount, 5, 15 * MINUTE)) || (await isLimited(perIp, 30, 15 * MINUTE))) {
    return NextResponse.json({ error: "Too many attempts. Please wait 15 minutes and try again." }, { status: 429 });
  }

  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (!user || !verifyPassword(password, user.passwordHash)) {
    await recordAttempt(perAccount, perIp);
    return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
  }

  await clearAttempts(perAccount);
  setSession(user.id, user.sessionVersion);
  return NextResponse.json({ role: user.role });
}
