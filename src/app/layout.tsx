import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/Header";
import VerifyBanner from "@/components/VerifyBanner";
import { getUser } from "@/lib/auth";
import { needsVerification } from "@/lib/verify";

export const metadata: Metadata = {
  title: "ShopZone - Online Shopping Marketplace",
  description: "Shop electronics, fashion, home and more from trusted sellers.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="en">
      <body>
        <Header user={user ? { name: user.name, role: user.role } : null} />
        {user && needsVerification(user) && <VerifyBanner email={user.email} />}
        <main className="container">{children}</main>
        <footer className="footer">© {new Date().getFullYear()} ShopZone. All rights reserved.</footer>
      </body>
    </html>
  );
}
