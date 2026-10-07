"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "./ProfileProvider";
import { cx } from "./ui";

export function SiteHeader() {
  const { user, accountsEnabled, profile, ready, sync } = useProfile();
  const pathname = usePathname();
  const started = ready && (profile.onboarding.quiz || profile.photo || profile.products.length > 0);
  const inFlow = pathname.startsWith("/start");

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Perfect<span className="text-accent">Match</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {started && !inFlow && (
            <>
              <NavLink href="/profile" active={pathname.startsWith("/profile")}>
                My profile
              </NavLink>
              <NavLink href="/profile/products" active={false} className="hidden sm:inline-flex">
                Log a product
              </NavLink>
            </>
          )}
          {accountsEnabled &&
            (user ? (
              <Link
                href="/account"
                className="ml-1 flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 hover:border-ink/40"
                title={sync === "error" ? "Sync problem — open account" : "Account"}
              >
                <span className={cx("h-2 w-2 rounded-full", sync === "error" ? "bg-bad" : sync === "syncing" ? "bg-warn" : "bg-good")} />
                <span className="max-w-32 truncate">{user.email ?? "Account"}</span>
              </Link>
            ) : (
              ready && (
                <Link href="/account" className="ml-1 rounded-full border border-line bg-surface px-3.5 py-1.5 hover:border-ink/40">
                  Sign in
                </Link>
              )
            ))}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, active, children, className }: { href: string; active: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cx("inline-flex rounded-full px-3 py-1.5 transition", active ? "bg-ink/5 text-ink" : "text-muted hover:text-ink", className)}
    >
      {children}
    </Link>
  );
}
