import Link from "next/link";

const links = [
  { href: "/forecasts", label: "Forecasts" },
  { href: "/commits", label: "Commits", muted: true },
  { href: "/exceptions", label: "Exceptions", muted: true },
  { href: "/purchase-orders", label: "POs", muted: true },
  { href: "/change-orders", label: "Change orders", muted: true },
  { href: "/partners", label: "Partners", muted: true },
];

export function AppNav() {
  return (
    <header className="app-nav">
      <Link href="/" className="app-nav-brand">
        SCP
      </Link>
      <nav>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={link.muted ? "muted" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
