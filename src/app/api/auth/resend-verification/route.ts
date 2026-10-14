import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isLimited, MINUTE, recordAttempt } from "@/lib/rateLimit";
import { mailConfigured } from "@/lib/mail";
import { sendVerificationEmail } from "@/lib/verify";

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ ok: true });
  if (!mailConfigured()) return NextResponse.json({ error: "Email is not set up on this shop yet" }, { status: 503 });

  const key = `resendverify:${user.id}`;
  if (await isLimited(key, 3, 60 * MINUTE)) {
    return NextResponse.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
  }
  await recordAttempt(key);

  const sent = await sendVerificationEmail(user);
  if (!sent) return NextResponse.json({ error: "We could not send the email. Please try again later." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
