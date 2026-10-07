"use client";

import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const STEPS = [
  { href: "/start/photo", label: "Photo" },
  { href: "/start/quiz", label: "Quiz", also: ["/start/products"] },
  { href: "/start/budget", label: "Budget" },
];

export default function StartLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = STEPS.findIndex((s) => pathname.startsWith(s.href) || s.also?.some((a) => pathname.startsWith(a)));

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 pt-8">
      <ol className="mb-10 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]">
        {STEPS.map((s, i) => (
          <li key={s.href} className="flex flex-1 flex-col gap-2">
            <span className={cx("h-1 rounded-full", i <= current ? "bg-ink" : "bg-line")} />
            <span className={i === current ? "text-ink" : "text-faint"}>
              {i + 1}. {s.label}
            </span>
          </li>
        ))}
      </ol>
      {children}
    </div>
  );
}
