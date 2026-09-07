"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";

type Props = {
  name: string;
  role: "staff" | "admin";
};

export default function Header({ name, role }: Props) {
  const pathname = usePathname();

  const links =
    role === "admin"
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/reports", label: "Reports" },
          { href: "/settings", label: "Settings" },
        ]
      : [{ href: "/activity", label: "Activity" }];

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold tracking-tight">Stockroom</span>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                  pathname?.startsWith(l.href)
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-sm text-ink-muted hidden sm:inline">
            {name} <span className="text-ink-faint">· {role}</span>
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs rounded-md border border-border px-2.5 py-1.5 text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
