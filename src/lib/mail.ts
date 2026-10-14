/**
 * Sends email through Resend (https://resend.com) with a plain fetch call, so there is nothing extra to install.
 * If RESEND_API_KEY / MAIL_FROM are not set, sendMail does nothing and returns false.
 */
export function mailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export function siteUrl() {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Escape text before putting it inside HTML (names and product titles come from users). */
export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.error("Email failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("Email failed:", e);
    return false;
  }
}

/** Simple, readable email layout (inline styles, because email apps ignore stylesheets). */
export function emailLayout(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#212121">
  <div style="background:#f57224;color:#fff;padding:16px 20px;font-size:22px;font-weight:bold">ShopZone</div>
  <div style="padding:20px;border:1px solid #e8e8e8;border-top:0">
    <h2 style="margin:0 0 12px;font-size:18px">${esc(title)}</h2>
    ${body}
  </div>
  <p style="color:#757575;font-size:12px;padding:12px 4px">You received this email because of activity on your ShopZone account.</p>
</div>`;
}

export const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#f57224;color:#fff;padding:12px 24px;text-decoration:none;border-radius:3px;font-weight:bold">${esc(label)}</a></p>`;
