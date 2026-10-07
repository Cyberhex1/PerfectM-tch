"use client";

import type { Warning } from "@/lib/ingredients";
import { Badge, cx } from "./ui";

const TONE = { high: "bad", medium: "warn", low: "neutral" } as const;

export function IngredientWarnings({
  warnings,
  onClear,
  empty,
}: {
  warnings: Warning[];
  onClear?: (ingredient: string) => void;
  empty?: string;
}) {
  if (!warnings.length) return empty ? <p className="text-sm text-good">{empty}</p> : null;
  return (
    <ul className="space-y-2">
      {warnings.map((w) => (
        <li
          key={w.ingredient}
          className={cx(
            "rounded-xl border p-3 text-sm",
            w.level === "high" ? "border-bad/25 bg-bad-soft/60" : w.level === "medium" ? "border-warn/25 bg-warn-soft/60" : "border-line bg-surface",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium capitalize">{w.ingredient}</span>
            <Badge tone={TONE[w.level]}>{w.level === "high" ? "Avoid" : w.level === "medium" ? "Caution" : "Heads-up"}</Badge>
          </div>
          <ul className="mt-1.5 space-y-0.5 text-muted">
            {w.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {onClear && (
            <button type="button" onClick={() => onClear(w.ingredient)} className="mt-2 text-xs underline underline-offset-4">
              This one&apos;s fine for me
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
