import { requireUser } from "@/lib/auth";
import { ChangePasswordForm, SignOutAllButton } from "@/components/SecurityForms";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const user = await requireUser("/account/security");
  return (
    <>
      <section className="section">
        <div className="section-head"><h2>Account security</h2></div>
        <div className="pad">
          <p>
            Signed in as <strong>{user.email}</strong>.{" "}
            {user.emailVerified ? <span className="ok">Email confirmed ✓</span> : <span style={{ color: "var(--muted)" }}>Email not confirmed yet.</span>}
          </p>
        </div>
      </section>

      <section className="section auth-card">
        <div className="section-head"><h2>Change password</h2></div>
        <ChangePasswordForm />
      </section>

      <section className="section auth-card">
        <div className="section-head"><h2>Sign out everywhere</h2></div>
        <div className="pad">
          <p style={{ color: "var(--muted)", marginBottom: 12 }}>
            Lost a phone or used a shared computer? This logs you out on every device, including this one.
          </p>
          <SignOutAllButton />
        </div>
      </section>
    </>
  );
}
