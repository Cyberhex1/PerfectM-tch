"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/ProfileProvider";
import { ButtonLink, cx, Spinner, Title } from "@/components/ui";

const TABS = [
  { href: "/profile", label: "Overview" },
  { href: "/profile/foundation", label: "Foundation" },
  { href: "/profile/makeup", label: "Makeup" },
  { href: "/profile/skincare", label: "Skincare" },
  { href: "/profile/photos", label: "Photos" },
  { href: "/profile/products", label: "My products" },
  { href: "/profile/ingredients", label: "Ingredients" },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, profile } = useProfile();
  const started = profile.onboarding.quiz || !!profile.photo || profile.products.length > 0;

  if (!ready)
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted">
        <Spinner />
      </div>
    );

  if (!started)
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <Title>Let&apos;s build your profile first.</Title>
        <p className="mt-4 text-muted">It takes about three minutes: a photo, a short quiz and your budget.</p>
        <ButtonLink href="/start/photo" className="mt-8">
          Get started
        </ButtonLink>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16">
      <nav aria-label="Profile sections" className="-mx-5 mb-8 overflow-x-auto border-b border-line px-5">
        <ul className="flex min-w-max gap-1">
          {TABS.map((t) => {
            const active = t.href === "/profile" ? pathname === "/profile" : pathname.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={cx(
                    "inline-block border-b-2 px-3 py-3.5 text-sm transition",
                    active ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink",
                  )}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="pm-fade-up" key={pathname}>
        {children}
      </div>
    </div>
  );
}
