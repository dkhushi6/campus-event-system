"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/constants";
import { ROLE_LABELS } from "@/lib/constants";

type NavItem = { href: string; label: string; roles: Role[] };

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["STUDENT", "ORGANIZER", "ADMIN"] },
  { href: "/events", label: "Events", roles: ["STUDENT", "ORGANIZER", "ADMIN"] },
  { href: "/tickets", label: "My tickets", roles: ["STUDENT", "ORGANIZER", "ADMIN"] },
  { href: "/organizer", label: "Manage events", roles: ["ORGANIZER", "ADMIN"] },
  { href: "/organizer/scan", label: "Scan QR", roles: ["ORGANIZER", "ADMIN"] },
  { href: "/admin/users", label: "Users", roles: ["ADMIN"] },
  { href: "/admin/reports", label: "Reports", roles: ["ADMIN"] },
];

export function Nav({
  user,
  unreadCount,
}: {
  user: { name: string; role: Role };
  unreadCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/organizer") return pathname === "/organizer";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">
            CE
          </span>
          <span className="hidden sm:inline">Campus Events</span>
        </Link>

        <nav className="ml-2 hidden flex-1 items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                isActive(item.href)
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-surface-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/notifications"
            className="relative rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-muted"
          >
            Alerts
            {unreadCount > 0 ? (
              <span className="ml-1 rounded-full bg-danger-soft px-1.5 py-0.5 text-xs font-bold text-danger">
                {unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight">{user.name}</p>
            <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={signOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>

          <button
            className="btn btn-secondary md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
        </div>
      </div>

      {open ? (
        <nav className="grid gap-1 border-t px-4 py-2 md:hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(item.href)
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-surface-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
