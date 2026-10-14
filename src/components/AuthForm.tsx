"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const router = useRouter();
  const [role, setRole] = useState<"CUSTOMER" | "SELLER">("CUSTOMER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, role }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong");
    // Sellers land on their dashboard, admins on the admin panel, everyone else where they were going.
    const dest = data.role === "SELLER" && next === "/" ? "/seller" : data.role === "ADMIN" && next === "/" ? "/admin" : next;
    router.push(dest);
    router.refresh();
  }

  const isRegister = mode === "register";

  return (
    <section className="section auth-card">
      <div className="section-head"><h2>{isRegister ? "Create your ShopZone account" : "Welcome back! Please login"}</h2></div>
      <form className="form" onSubmit={submit}>
        {isRegister && (
          <div className="seg">
            <button type="button" className={role === "CUSTOMER" ? "on" : ""} onClick={() => setRole("CUSTOMER")}>I want to shop</button>
            <button type="button" className={role === "SELLER" ? "on" : ""} onClick={() => setRole("SELLER")}>I want to sell</button>
          </div>
        )}
        {isRegister && <label>Full name<input name="name" required autoComplete="name" /></label>}
        {isRegister && role === "SELLER" && <label>Shop name<input name="shopName" required /></label>}
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label>
          Password{isRegister && " (8+ characters)"}
          <input name="password" type="password" required minLength={isRegister ? 8 : undefined} autoComplete={isRegister ? "new-password" : "current-password"} />
        </label>
        {!isRegister && (
          <Link href="/forgot-password" style={{ color: "var(--brand)", fontSize: 13 }}>Forgot password?</Link>
        )}
        {error && <p style={{ color: "var(--red)" }}>{error}</p>}
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? "Please wait…" : isRegister ? "Sign up" : "Login"}
        </button>
        <p style={{ color: "var(--muted)" }}>
          {isRegister ? (
            <>Already a member? <Link href={`/login?next=${encodeURIComponent(next)}`} style={{ color: "var(--brand)" }}>Login</Link></>
          ) : (
            <>New to ShopZone? <Link href={`/register?next=${encodeURIComponent(next)}`} style={{ color: "var(--brand)" }}>Sign up</Link></>
          )}
        </p>
      </form>
    </section>
  );
}
