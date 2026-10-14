"use client";

import { useState } from "react";

export default function VerifyBanner({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function resend() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Sent! Check your inbox." : data.error ?? "Something went wrong");
  }

  return (
    <div role="status" style={{ background: "#fff8e1", borderBottom: "1px solid #ffe082", padding: "8px 16px", fontSize: 14, textAlign: "center" }}>
      Please confirm your email address ({email}) to place orders.{" "}
      <button onClick={resend} disabled={busy} style={{ background: "none", color: "var(--brand)", font: "inherit", textDecoration: "underline", cursor: "pointer" }}>
        {busy ? "Sending…" : "Resend the email"}
      </button>
      {msg && <span style={{ marginLeft: 8 }}>{msg}</span>}
    </div>
  );
}
