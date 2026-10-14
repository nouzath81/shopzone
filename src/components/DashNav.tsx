import Link from "next/link";

export default function DashShell({
  title,
  links,
  children,
}: {
  title: string;
  links: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="dash">
      <nav className="dash-nav">
        <h4>{title}</h4>
        {links.map((l) => (
          <Link key={l.href} href={l.href}>{l.label}</Link>
        ))}
      </nav>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{children}</div>
    </div>
  );
}
