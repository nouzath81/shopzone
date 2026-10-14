import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import { button, emailLayout, esc, mailConfigured, sendMail, siteUrl } from "./mail";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Verification is only enforced when email is set up. Without a mail service nobody could ever receive the link,
 * and the shop would lock every customer out of checkout.
 */
export function needsVerification(user: { emailVerified: Date | null }) {
  return mailConfigured() && !user.emailVerified;
}

/** Replaces any older link with a fresh one (valid 24 hours) and emails it. Returns true if the mail was sent. */
export async function sendVerificationEmail(user: { id: string; name: string; email: string }) {
  await db.emailVerification.deleteMany({ where: { userId: user.id } });

  const token = randomBytes(32).toString("hex");
  await db.emailVerification.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"), // the database never holds the usable token
      expiresAt: new Date(Date.now() + DAY),
    },
  });

  const link = `${siteUrl()}/verify-email?token=${token}`;
  const sent = await sendMail({
    to: user.email,
    subject: "Confirm your ShopZone email",
    html: emailLayout(
      "Confirm your email address",
      `<p>Hi ${esc(user.name)}, welcome to ShopZone!</p>
       <p>Please confirm this is your email address. The link works for 24 hours.</p>
       ${button(link, "Confirm my email")}
       <p style="color:#757575;font-size:13px">If you didn't create an account, you can ignore this email.</p>`,
    ),
  });

  if (!sent && !mailConfigured() && process.env.NODE_ENV !== "production") {
    console.log(`\n[dev] Email is not configured. Verification link for ${user.email}:\n${link}\n`);
  }
  return sent;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
