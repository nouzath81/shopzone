"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: new FormData(e.currentTarget).get("email") }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong");
    setDone(true);
  }

  return (
    <section className="section auth-card">
      <div className="section-head"><h2>Forgot your password?</h2></div>
      {done ? (
        <div className="pad">
          <p>If there is an account for that email, we have sent a link to reset the password. It works for 1 hour.</p>
          <p style={{ marginTop: 12 }}><Link href="/login" style={{ color: "var(--brand)" }}>Back to login</Link></p>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <p style={{ color: "var(--muted)" }}>Enter your email and we will send you a link to choose a new password.</p>
          <label>Email<input name="email" type="email" required autoComplete="email" /></label>
          {error && <p style={{ color: "var(--red)" }}>{error}</p>}
          <button className="btn-primary" disabled={busy} type="submit">{busy ? "Sending…" : "Send reset link"}</button>
          <p><Link href="/login" style={{ color: "var(--brand)" }}>Back to login</Link></p>
        </form>
      )}
    </section>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) return setError("The two passwords don't match");
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: f.get("password") }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong");
    setDone(true);
  }

  return (
    <section className="section auth-card">
      <div className="section-head"><h2>Choose a new password</h2></div>
      {done ? (
        <div className="pad">
          <p className="ok">Your password has been changed.</p>
          <p style={{ marginTop: 12 }}>
            <Link href="/login" className="btn-primary" style={{ display: "inline-block" }}>Login</Link>
          </p>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <label>New password (8+ characters)<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
          <label>Type it again<input name="confirm" type="password" required minLength={8} autoComplete="new-password" /></label>
          {error && <p style={{ color: "var(--red)" }}>{error}</p>}
          <button className="btn-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Change password"}</button>
        </form>
      )}
    </section>
  );
}
