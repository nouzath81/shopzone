"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChangePasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setDone(false);
    if (f.get("password") !== f.get("confirm")) return setError("The two new passwords don't match");
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: f.get("current"), password: f.get("password") }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong");
    form.reset();
    setDone(true);
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>Current password<input name="current" type="password" required autoComplete="current-password" /></label>
      <label>New password (8+ characters)<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
      <label>Type the new password again<input name="confirm" type="password" required minLength={8} autoComplete="new-password" /></label>
      {error && <p style={{ color: "var(--red)" }}>{error}</p>}
      {done && <p className="ok">Password changed. Every other device has been signed out.</p>}
      <button className="btn-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Change password"}</button>
    </form>
  );
}

export function SignOutAllButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!confirm("Sign out of ShopZone on every device, including this one?")) return;
    setBusy(true);
    await fetch("/api/auth/logout-all", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="btn-primary" onClick={go} disabled={busy} type="button">
      {busy ? "Signing out…" : "Sign out everywhere"}
    </button>
  );
}
