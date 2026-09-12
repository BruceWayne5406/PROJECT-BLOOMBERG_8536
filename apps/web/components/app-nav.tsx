"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

const links = [
  { href: "/forecasts", label: "Forecasts" },
  { href: "/commits", label: "Commits", muted: true },
  { href: "/exceptions", label: "Exceptions", muted: true },
  { href: "/purchase-orders", label: "POs", muted: true },
  { href: "/change-orders", label: "Change orders", muted: true },
  { href: "/partners", label: "Partners", muted: true },
];

type Me = {
  actorId: string;
  displayName: string;
  partyType: string;
  role: string;
};

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      return res.json() as Promise<Me>;
    },
    enabled: pathname !== "/login",
  });

  if (pathname === "/login") return null;

  async function signOut() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="app-nav">
      <Link href="/forecasts" className="app-nav-brand">
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
      <div className="app-nav-user">
        {me.data ? (
          <>
            <span className="mono">{me.data.actorId}</span>
            <span className="muted">
              {me.data.displayName} · {me.data.partyType} {me.data.role}
            </span>
            <button type="button" className="btn" onClick={signOut}>
              Sign out
            </button>
          </>
        ) : null}
      </div>
    </header>
  );
}
