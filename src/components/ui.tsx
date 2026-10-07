"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-soft disabled:opacity-40 disabled:pointer-events-none";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink/85",
  secondary: "border border-line bg-surface text-ink hover:border-ink/40",
  ghost: "text-ink hover:bg-ink/5",
  danger: "border border-bad/30 text-bad hover:bg-bad-soft",
};

export function Button({ variant = "primary", className, ...rest }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={cx(buttonBase, buttonVariants[variant], className)} {...rest} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cx(buttonBase, buttonVariants[variant], className)} {...rest} />;
}

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cx("rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6", className)} {...rest} />;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-xs font-medium uppercase tracking-[0.14em] text-muted", className)}>{children}</p>;
}

export function Title({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cx("font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl", className)}>{children}</h1>;
}

export function H2({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cx("font-display text-2xl tracking-tight sm:text-3xl", className)}>{children}</h2>;
}

export function Chip({
  selected,
  className,
  ...rest
}: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        "rounded-full border px-3.5 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-soft",
        selected ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-ink/40",
        className,
      )}
      {...rest}
    />
  );
}

export function OptionCard({
  selected,
  title,
  description,
  onClick,
  aside,
}: {
  selected?: boolean;
  title: string;
  description?: string;
  onClick: () => void;
  aside?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-soft",
        selected ? "border-ink bg-surface shadow-[0_0_0_1px_var(--color-ink)]" : "border-line bg-surface hover:border-ink/40",
      )}
    >
      {aside}
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <span
        className={cx(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
          selected ? "border-ink bg-ink" : "border-line",
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] placeholder:text-faint focus:border-ink/50 focus:outline-none focus:ring-4 focus:ring-accent-soft";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx(inputCls, className)} {...rest} />;
}
export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx(inputCls, "min-h-28 resize-y leading-relaxed", className)} {...rest} />;
}
export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cx(inputCls, "appearance-none pr-9", className)} {...rest} />;
}

export function Swatch({ hex, size = 40, className, title }: { hex: string; size?: number; className?: string; title?: string }) {
  return (
    <span
      title={title ?? hex}
      className={cx("inline-block shrink-0 rounded-full ring-1 ring-black/10", className)}
      style={{ background: hex, width: size, height: size }}
    />
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad" | "accent"; children: ReactNode }) {
  const tones = {
    neutral: "bg-ink/5 text-ink",
    good: "bg-good-soft text-good",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
    accent: "bg-accent-soft text-accent",
  };
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Meter({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}

export function Notice({ tone = "neutral", children, className }: { tone?: "neutral" | "warn" | "bad" | "good"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "border-line bg-surface",
    warn: "border-warn/25 bg-warn-soft",
    bad: "border-bad/25 bg-bad-soft",
    good: "border-good/25 bg-good-soft",
  };
  return <div className={cx("rounded-2xl border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}>{children}</div>;
}
