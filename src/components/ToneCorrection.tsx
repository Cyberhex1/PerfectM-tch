"use client";

import { useProfile } from "./ProfileProvider";
import { ToneScale } from "./ToneScale";
import type { Lab } from "@/lib/types";

/** "Is this your skin tone?" — lets people correct what a photo got wrong. Saves immediately. */
export function ToneCorrection({ estimate, intro }: { estimate?: Lab; intro?: string }) {
  const { profile, update } = useProfile();
  const chosen = profile.toneOverride?.lab;
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted">
        {intro ??
          "Phone cameras often brighten deeper skin, so a photo can read lighter than you really are. Tap the swatch closest to your skin — your choice counts more than any photo."}
      </p>
      <ToneScale
        value={chosen}
        estimate={estimate}
        onPick={(lab) => update((p) => ({ ...p, toneOverride: { lab, setAt: new Date().toISOString() } }))}
      />
      {chosen && (
        <p className="flex flex-wrap items-center gap-x-3 text-sm">
          <span className="text-good">✓ Saved — your matches now use this tone.</span>
          <button
            type="button"
            className="text-muted underline underline-offset-4 hover:text-ink"
            onClick={() => update((p) => ({ ...p, toneOverride: undefined }))}
          >
            Go back to automatic
          </button>
        </p>
      )}
    </div>
  );
}
