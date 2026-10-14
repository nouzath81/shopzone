"use client";

import { useEffect, useRef } from "react";

/** Posts the signed order details to PayHere's secure payment page straight away. */
export default function PayHereRedirect({ action, fields }: { action: string; fields: Record<string, string> }) {
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    ref.current?.submit();
  }, []);

  return (
    <form ref={ref} method="post" action={action}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <p style={{ color: "var(--muted)", marginBottom: 12 }}>Taking you to PayHere&apos;s secure payment page…</p>
      <button className="btn-primary" type="submit">Continue to payment</button>
    </form>
  );
}
