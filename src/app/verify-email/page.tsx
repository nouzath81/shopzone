import Link from "next/link";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { hashToken } from "@/lib/verify";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? "";
  let state: "ok" | "bad" = "bad";

  if (/^[a-f0-9]{64}$/.test(token)) {
    const row = await db.emailVerification.findUnique({ where: { tokenHash: hashToken(token) } });
    if (row && row.expiresAt.getTime() > Date.now()) {
      await db.$transaction([
        db.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } }),
        db.emailVerification.deleteMany({ where: { userId: row.userId } }),
      ]);
      state = "ok";
    }
  }

  // A link that was already used still deserves a friendly answer if the person is verified now.
  const user = await getUser();
  if (state === "bad" && user?.emailVerified) state = "ok";

  return (
    <section className="section auth-card">
      <div className="section-head"><h2>{state === "ok" ? "Email confirmed" : "Link not valid"}</h2></div>
      <div className="pad">
        {state === "ok" ? (
          <>
            <p className="ok">Thank you! Your email address is confirmed.</p>
            <p style={{ marginTop: 12 }}>
              <Link href="/" className="btn-primary" style={{ display: "inline-block" }}>Continue shopping</Link>
            </p>
          </>
        ) : (
          <>
            <p>This confirmation link has expired or is not valid.</p>
            <p style={{ marginTop: 12, color: "var(--muted)" }}>
              {user
                ? "Use the “Resend” button in the yellow bar at the top of any page to get a new one."
                : "Log in, then use the “Resend” button in the yellow bar at the top of the page to get a new link."}
            </p>
            <p style={{ marginTop: 12 }}>
              <Link href={user ? "/" : "/login"} style={{ color: "var(--brand)" }}>{user ? "Go to the shop" : "Login"}</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
