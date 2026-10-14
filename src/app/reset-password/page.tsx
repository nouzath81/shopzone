import Link from "next/link";
import { ResetForm } from "@/components/PasswordForms";

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  if (!searchParams.token) {
    return (
      <section className="section auth-card">
        <div className="empty">
          This reset link is incomplete. <Link href="/forgot-password" style={{ color: "var(--brand)" }}>Request a new one</Link>
        </div>
      </section>
    );
  }
  return <ResetForm token={searchParams.token} />;
}
