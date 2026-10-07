"use client";

import { useRef } from "react";
import { deltaE2000, labToHex, TONE_SCALE } from "@/lib/color";
import type { Lab } from "@/lib/types";
import { cx } from "./ui";

const nearest = (lab: Lab) =>
  TONE_SCALE.reduce((best, t, i) => (deltaE2000(lab, t) < deltaE2000(lab, TONE_SCALE[best]) ? i : best), 0);

/**
 * Pick your skin tone from 13 steps. `estimate` marks where a photo landed, so people
 * can see — and correct — a camera that lightened or darkened them.
 */
export function ToneScale({ value, estimate, onPick }: { value?: Lab; estimate?: Lab; onPick: (lab: Lab) => void }) {
  const selected = value ? nearest(value) : -1;
  const estimated = estimate ? nearest(estimate) : -1;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    const next = Math.max(0, Math.min(TONE_SCALE.length - 1, from + delta));
    onPick(TONE_SCALE[next]);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <div role="radiogroup" aria-label="Your skin tone, lightest to deepest" className="grid grid-cols-7 gap-1.5 sm:grid-cols-13">
        {TONE_SCALE.map((t, i) => {
          const isSel = i === selected;
          return (
            <button
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSel}
              aria-label={`Tone ${i + 1} of ${TONE_SCALE.length}${i === estimated ? ", your photo's reading" : ""}`}
              tabIndex={isSel || (selected < 0 && i === (estimated >= 0 ? estimated : 0)) ? 0 : -1}
              onClick={() => onPick(t)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  move(i, 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  move(i, -1);
                }
              }}
              className="relative flex flex-col items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-soft"
            >
              <span
                className={cx(
                  "block aspect-square w-full max-w-11 rounded-full ring-1 ring-black/10 transition",
                  isSel && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
                )}
                style={{ background: labToHex(t) }}
              />
              <span className={cx("h-1.5 w-1.5 rounded-full", i === estimated ? "bg-ink/50" : "bg-transparent")} aria-hidden />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-faint">
        <span>Lightest</span>
        {estimated >= 0 && <span>• = your photo&apos;s reading</span>}
        <span>Deepest</span>
      </div>
    </div>
  );
}
