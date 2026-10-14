"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";

type HeaderUser = { name: string; role: "CUSTOMER" | "SELLER" | "ADMIN" } | null;

export default function Header({ user }: { user: HeaderUser }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { count } = useCart();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div className="topbar">
        <div className="container">
          {user?.role === "SELLER" ? (
            <Link href="/seller">Seller Centre</Link>
          ) : user?.role === "ADMIN" ? (
            <Link href="/admin">Admin</Link>
          ) : (
            <Link href="/register">Sell on ShopZone</Link>
          )}
          {user ? (
            <>
              <Link href="/account/wishlist">Wishlist</Link>
              <Link href="/account/orders">My Orders</Link>
              <Link href="/account/addresses">Addresses</Link>
              <Link href="/account/security">Security</Link>
              <span>Hi, {user.name.split(" ")[0]}</span>
              <button onClick={logout} style={{ background: "none", color: "inherit", font: "inherit" }}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register">Sign Up</Link>
            </>
          )}
        </div>
      </div>
      <header className="header">
        <div className="container">
          <Link href="/" className="logo">ShopZone</Link>
          <form className="search" onSubmit={submit}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in ShopZone" />
            <button type="submit">Search</button>
          </form>
          <Link href="/cart" className="cart-link">
            🛒 Cart
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>
        </div>
      </header>
    </>
  );
}
