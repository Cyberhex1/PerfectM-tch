"use client";

import type { ProductCategory, Reaction } from "@/lib/types";
import { Chip } from "./ui";

export const REACTION_LABEL: Record<Reaction, string> = {
  breakout: "Broke me out",
  irritation: "Stung / irritated",
  redness: "Made me red",
  itching: "Itchy",
  dryness: "Too drying",
  greasy: "Too greasy / heavy",
  "too-light": "Shade too light",
  "too-dark": "Shade too dark",
  "too-pink": "Too pink",
  "too-yellow": "Too yellow / orange",
  oxidized: "Oxidized (darkened)",
  cakey: "Cakey",
  patchy: "Patchy / clung to dry spots",
};

const SKIN: Reaction[] = ["breakout", "irritation", "redness", "itching", "dryness", "greasy"];
const SHADE: Reaction[] = ["too-light", "too-dark", "too-pink", "too-yellow", "oxidized", "cakey", "patchy"];
const COMPLEXION: ProductCategory[] = ["foundation", "concealer", "powder"];

export function ReactionPicker({
  category,
  value,
  onChange,
}: {
  category: ProductCategory;
  value: Reaction[];
  onChange: (v: Reaction[]) => void;
}) {
  const options = COMPLEXION.includes(category) ? [...SHADE, ...SKIN] : SKIN;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((r) => (
        <Chip
          key={r}
          className="px-3 py-1 text-xs"
          selected={value.includes(r)}
          onClick={() => onChange(value.includes(r) ? value.filter((x) => x !== r) : [...value, r])}
        >
          {REACTION_LABEL[r]}
        </Chip>
      ))}
    </div>
  );
}
