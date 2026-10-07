"use client";

import type { Preferences } from "@/lib/types";

const PRICES = [8, 12, 15, 20, 25, 30, 35, 45, 55, 70, 90, 120];

const priceBand = (v: number) => (v < 20 ? "Drugstore" : v < 40 ? "Mid-range" : v < 60 ? "Prestige" : "Luxury");
const qualityBand = (v: number) => (v < 25 ? "Value first" : v < 45 ? "Mostly value" : v < 60 ? "Balanced" : v < 80 ? "Performance-leaning" : "Best-in-class");

function summary({ budget, quality }: Preferences) {
  if (budget < 20 && quality >= 60) return "Hard-working drugstore heroes, with the occasional splurge when it really matters.";
  if (budget < 20) return "Affordable, proven basics — no paying for packaging.";
  if (budget >= 60 && quality >= 60) return "The best formulas available, price aside.";
  if (budget >= 60) return "Room to splurge, but we'll still flag great-value finds.";
  if (quality >= 70) return "Mid-range and prestige picks chosen for performance.";
  return "A mix of smart drugstore and mid-range picks.";
}

export function BudgetSliders({ value, onChange }: { value: Preferences; onChange: (v: Preferences) => void }) {
  const idx = PRICES.reduce((best, p, i) => (Math.abs(p - value.budget) < Math.abs(PRICES[best] - value.budget) ? i : best), 0);

  return (
    <div className="space-y-10">
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <label htmlFor="budget" className="font-medium">
            Budget per product
          </label>
          <span className="font-display text-3xl">
            {value.budget >= 120 ? "$120+" : `$${value.budget}`}
            <span className="ml-2 font-sans text-sm text-muted">{priceBand(value.budget)}</span>
          </span>
        </div>
        <input
          id="budget"
          type="range"
          className="pm-range"
          min={0}
          max={PRICES.length - 1}
          step={1}
          value={idx}
          style={{ "--fill": `${(idx / (PRICES.length - 1)) * 100}%` } as React.CSSProperties}
          onChange={(e) => onChange({ ...value, budget: PRICES[Number(e.target.value)] })}
          aria-valuetext={`$${value.budget}, ${priceBand(value.budget)}`}
        />
        <div className="mt-2 flex justify-between text-xs text-faint">
          <span>Budget-conscious</span>
          <span>Happy to splurge</span>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <label htmlFor="quality" className="font-medium">
            How much does top performance matter?
          </label>
          <span className="text-sm text-muted">{qualityBand(value.quality)}</span>
        </div>
        <input
          id="quality"
          type="range"
          className="pm-range"
          min={0}
          max={100}
          step={5}
          value={value.quality}
          style={{ "--fill": `${value.quality}%` } as React.CSSProperties}
          onChange={(e) => onChange({ ...value, quality: Number(e.target.value) })}
          aria-valuetext={qualityBand(value.quality)}
        />
        <div className="mt-2 flex justify-between text-xs text-faint">
          <span>Good enough is great</span>
          <span>Only the best</span>
        </div>
      </div>

      <p className="rounded-2xl bg-surface px-5 py-4 text-sm leading-relaxed ring-1 ring-line">
        <span className="font-medium">What this means: </span>
        {summary(value)}
      </p>
    </div>
  );
}
