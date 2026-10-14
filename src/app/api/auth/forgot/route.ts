import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { button, emailLayout, esc, mailConfigured, sendMail, siteUrl } from "@/lib/mail";
import { clientIp, isLimited, MINUTE, recordAttempt } from "@/lib/rateLimit";

const HOUR = 60 * MINUTE;

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });

  // Limits are keyed on what was typed (not on whether the account exists), so they reveal nothing.
  const ipKey = `forgot:${clientIp()}`;
  const mailKey = `forgotmail:${email}`;
  if ((await isLimited(ipKey, 10, HOUR)) || (await isLimited(mailKey, 3, HOUR))) {
    return NextResponse.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
  }
  await recordAttempt(ipKey, mailKey);

  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    // Only the newest link works: remove older unused ones.
    await db.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });

    const token = randomBytes(32).toString("hex");
    await db.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"), // the database never holds the usable token
        expiresAt: new Date(Date.now() + HOUR),
      },
    });

    const link = `${siteUrl()}/reset-password?token=${token}`;
    const sent = await sendMail({
      to: user.email,
      subject: "Reset your ShopZone password",
      html: emailLayout(
        "Reset your password",
        `<p>Hi ${esc(user.name)},</p>
         <p>We got a request to reset your password. This link works for 1 hour and can be used once.</p>
         ${button(link, "Choose a new password")}
         <p style="color:#757575;font-size:13px">If you didn't ask for this, you can ignore this email. Your password stays the same.</p>`,
      ),
    });

    // Local development without email set up: show the link in the terminal so you can still test.
    if (!sent && !mailConfigured() && process.env.NODE_ENV !== "production") {
      console.log(`\n[dev] Email is not configured. Password reset link for ${user.email}:\n${link}\n`);
    } else if (!sent && !mailConfigured()) {
      console.warn("Password reset requested but email is not configured (set RESEND_API_KEY and MAIL_FROM).");
    }
  }

  // Same answer whether or not the account exists.
  return NextResponse.json({ ok: true });
}
