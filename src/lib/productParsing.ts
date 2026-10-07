import { guessFoundation, type FoundationDb } from "./foundations";
import type { ProductCategory, ProductEntry, Reaction, Verdict } from "./types";

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  foundation: "Foundation",
  concealer: "Concealer",
  powder: "Powder",
  blush: "Blush",
  bronzer: "Bronzer",
  lip: "Lip",
  eye: "Eye",
  primer: "Primer",
  cleanser: "Cleanser",
  moisturizer: "Moisturizer",
  serum: "Serum / treatment",
  sunscreen: "Sunscreen",
  toner: "Toner",
  exfoliant: "Exfoliant",
  mask: "Mask",
  other: "Other",
};

const CATEGORY_HINTS: [ProductCategory, RegExp][] = [
  ["sunscreen", /\b(spf|sunscreen|sun screen|sunblock|uv)\b/i],
  ["concealer", /\bconcealer\b/i],
  ["foundation", /\b(foundation|skin tint|tinted moisturi[sz]er|bb cream|cc cream|cushion)\b/i],
  ["primer", /\bprimer\b/i],
  ["powder", /\b(setting powder|powder)\b/i],
  ["blush", /\bblush\b/i],
  ["bronzer", /\b(bronzer|contour)\b/i],
  ["lip", /\b(lipstick|lip|gloss|liner)\b/i],
  ["eye", /\b(mascara|eyeshadow|eye shadow|eyeliner|palette|brow)\b/i],
  ["cleanser", /\b(cleanser|face wash|cleansing|micellar|wash)\b/i],
  ["exfoliant", /\b(exfoliant|exfoliator|peel|aha|bha|glycolic|salicylic|scrub)\b/i],
  ["toner", /\b(toner|essence|mist)\b/i],
  ["serum", /\b(serum|ampoule|retinol|niacinamide|vitamin c|treatment|tretinoin|adapalene|differin)\b/i],
  ["moisturizer", /\b(moisturi[sz]er|cream|lotion|gel cream|balm|emulsion)\b/i],
  ["mask", /\bmask\b/i],
];

export function guessCategory(text: string): ProductCategory | null {
  for (const [cat, re] of CATEGORY_HINTS) if (re.test(text)) return cat;
  return null;
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Split a free-form list ("one per line" — but people also use commas and bullets). */
export function splitList(text: string): string[] {
  const lines = text
    .split(/\r?\n|;|•/)
    .map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
  // a single line with commas is probably a comma-separated list
  if (lines.length === 1 && lines[0].includes(",")) return lines[0].split(",").map((s) => s.trim()).filter(Boolean);
  return lines;
}

const REACTION_HINTS: [Reaction, RegExp][] = [
  ["breakout", /\b(broke (me )?out|break ?outs?|breaking out|pimples?|acne|clogged)\b/i],
  ["irritation", /\b(irritat\w*|st[iu]ng|burn(ed|ing|t)?)\b/i],
  ["redness", /\b(red(ness)?|flush\w*|rash)\b/i],
  ["itching", /\bitch\w*/i],
  ["dryness", /\b(dry(ing)?|flak\w*|tight)\b/i],
  ["greasy", /\b(greasy|oily|heavy)\b/i],
  ["too-light", /\btoo (light|pale|fair)\b/i],
  ["too-dark", /\btoo dark\b/i],
  ["too-pink", /\btoo (pink|rosy|cool)\b/i],
  ["too-yellow", /\btoo (yellow|orange|warm|golden)\b/i],
  ["oxidized", /\boxidi[sz]\w*/i],
  ["cakey", /\bcakey\b/i],
  ["patchy", /\bpatchy\b/i],
];

/** Pick up reactions people mention inline ("Fit Me 220 — too pink, broke me out"). */
export function detectReactions(text: string): Reaction[] {
  return REACTION_HINTS.filter(([, re]) => re.test(text)).map(([r]) => r);
}

export type ParsedLine = { entry: ProductEntry; recognized?: string };

/** Turn the quiz's free-text boxes into product log entries, recognising foundations + shades. */
export function parseProductList(text: string, verdict: Verdict, db: FoundationDb | null): ParsedLine[] {
  return splitList(text).map((line) => {
    const entry: ProductEntry = {
      id: newId(),
      name: line,
      category: guessCategory(line) ?? "other",
      verdict,
      reactions: verdict === "disliked" ? detectReactions(line) : [],
      source: "quiz",
      raw: line,
      addedAt: new Date().toISOString(),
    };
    let recognized: string | undefined;
    const looksLikeFace = ["foundation", "concealer", "other"].includes(entry.category);
    const guess = db && looksLikeFace ? guessFoundation(db, line) : null;
    if (guess && guess.confidence >= 0.4) {
      entry.brand = guess.product.brand;
      entry.name = guess.product.name;
      if (entry.category === "other") entry.category = "foundation";
      if (guess.shade) {
        entry.shade = guess.shade.label;
        entry.shadeRef = guess.shade.ref;
      }
      recognized = `${guess.product.brand} ${guess.product.name}${guess.shade ? ` · ${guess.shade.label}` : " (add your shade to sharpen matching)"}`;
    }
    return { entry, recognized };
  });
}
