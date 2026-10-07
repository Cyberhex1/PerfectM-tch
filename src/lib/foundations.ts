import { deltaE2000, hexToLab } from "./color";
import type { Coverage, Finish, Lab } from "./types";

export type UndertoneCode = "C" | "CN" | "N" | "WN" | "W" | "O" | "";

export type FoundationProduct = {
  id: string;
  brand: string;
  name: string;
  /** 1 drugstore · 2 mid · 3 prestige · 4 luxury */
  tier: 1 | 2 | 3 | 4;
  form: "liquid" | "powder" | "stick" | "cushion" | "tint" | "cream";
  finish: Finish;
  coverage: Coverage;
  spf: boolean;
  shades: [label: string, hex: string, undertone: UndertoneCode][];
};

export type Shade = {
  ref: string;
  productId: string;
  index: number;
  label: string;
  hex: string;
  lab: Lab;
  undertone: UndertoneCode;
};

export type FoundationDb = {
  source: { name: string; url: string; license: string };
  products: FoundationProduct[];
  byId: Map<string, FoundationProduct>;
  shades: Map<string, Shade[]>;
};

export const UNDERTONE_AXIS: Record<Exclude<UndertoneCode, "">, number> = {
  C: -1,
  CN: -0.5,
  N: 0,
  WN: 0.5,
  W: 1,
  O: 0.35,
};

export const UNDERTONE_LABEL: Record<UndertoneCode, string> = {
  C: "cool",
  CN: "cool-neutral",
  N: "neutral",
  WN: "warm-neutral",
  W: "warm",
  O: "olive",
  "": "",
};

export const TIER_PRICE: Record<1 | 2 | 3 | 4, number> = { 1: 12, 2: 36, 3: 50, 4: 72 };
export const TIER_LABEL: Record<1 | 2 | 3 | 4, string> = { 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };

export const shadeRef = (productId: string, index: number) => `${productId}::${index}`;

export function buildDb(raw: { source: FoundationDb["source"]; products: FoundationProduct[] }): FoundationDb {
  const byId = new Map(raw.products.map((p) => [p.id, p]));
  const shades = new Map(
    raw.products.map((p) => [
      p.id,
      p.shades.map(([label, hex, undertone], index) => ({
        ref: shadeRef(p.id, index),
        productId: p.id,
        index,
        label,
        hex: `#${hex}`,
        lab: hexToLab(hex),
        undertone,
      })),
    ]),
  );
  return { ...raw, byId, shades };
}

let cache: Promise<FoundationDb> | null = null;
export function loadFoundations(): Promise<FoundationDb> {
  if (!cache) {
    cache = fetch("/data/foundations.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Couldn't load the foundation shade library (${r.status})`);
        return r.json();
      })
      .then(buildDb)
      .catch((e) => {
        cache = null;
        throw e;
      });
  }
  return cache;
}

export function resolveShade(db: FoundationDb, ref?: string) {
  if (!ref) return null;
  const [productId, idx] = ref.split("::");
  const product = db.byId.get(productId);
  const shade = db.shades.get(productId)?.[Number(idx)];
  return product && shade ? { product, shade } : null;
}

// ---------- fuzzy matching of free-text product names ----------

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`™®]/g, "")
    .replace(/[^a-z0-9.+]+/g, " ")
    .trim();

const BRAND_ALIASES: Record<string, string> = {
  fenty: "FENTY BEAUTY by Rihanna",
  "estee lauder": "Estée Lauder",
  estee: "Estée Lauder",
  mufe: "MAKE UP FOR EVER",
  "make up for ever": "MAKE UP FOR EVER",
  "makeup forever": "MAKE UP FOR EVER",
  ysl: "Yves Saint Laurent",
  "it cosmetics": "It Cosmetics",
  loreal: "L'Oréal",
  "l oreal": "L'Oréal",
  elf: "e.l.f. Cosmetics",
  "e.l.f": "e.l.f. Cosmetics",
  nyx: "NYX Professional Makeup",
  armani: "Armani Beauty",
  giorgio: "Armani Beauty",
  huda: "HUDA BEAUTY",
  "rare beauty": "Rare Beauty by Selena Gomez",
  "pat mcgrath": "PAT McGRATH LABS",
  "urban decay": "Urban Decay Cosmetics",
  kvd: "KVD Vegan Beauty",
  "kat von d": "KVD Vegan Beauty",
  becca: "BECCA Cosmetics",
  "too faced": "Too Faced",
  "bare minerals": "bareMinerals",
  "charlotte": "Charlotte Tilbury",
  "tom ford": "TOM FORD",
  milk: "MILK MAKEUP",
  "cover fx": "COVER FX",
  coverfx: "COVER FX",
  sephora: "SEPHORA COLLECTION",
  "wet n wild": "Wet n Wild",
  "physicians formula": "Physicians Formula",
};

const STOP = new Set(["foundation", "the", "and", "with", "spf", "by", "in", "shade", "my", "for", "of", "+", "too"]);
const tokens = (s: string) => normalize(s).split(" ").filter((t) => t && !STOP.has(t));

export type FoundationGuess = {
  product: FoundationProduct;
  shade?: Shade;
  /** 0–1 */
  confidence: number;
};

/** Best-effort match of free text like "Fenty Pro Filt'r 240" to a product (and shade). */
export function guessFoundation(db: FoundationDb, text: string, shadeText?: string): FoundationGuess | null {
  const norm = normalize(text);
  if (!norm) return null;
  let brandHint: string | undefined;
  for (const [alias, brand] of Object.entries(BRAND_ALIASES)) {
    if (new RegExp(`(^| )${alias.replace(/\./g, "\\.")}( |$)`).test(norm)) brandHint = brand;
  }
  const qt = tokens(text);
  const candidates: { p: FoundationProduct; score: number }[] = [];
  for (const p of db.products) {
    const bt = tokens(p.brand);
    const nt = tokens(p.name);
    const brandMatch =
      brandHint === p.brand || (bt.length > 0 && bt.every((t) => qt.includes(t))) || qt.includes(bt[0] ?? "\u0000");
    const nameHits = nt.filter((t) => qt.includes(t) || qt.some((q) => q.length > 3 && t.startsWith(q))).length;
    if (!brandMatch && nameHits < 2) continue;
    const score = (brandMatch ? 2 : 0) + nameHits * 1.5 - nt.length * 0.15;
    if (score >= 2.5) candidates.push({ p, score });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);

  // Among similar products ("Fit Me Matte" vs "Fit Me Dewy"), a matching shade code decides.
  const st = new Set(tokens(shadeText ?? text));
  let best: { p: FoundationProduct; score: number; shade?: Shade } | null = null;
  for (const c of candidates.filter((c) => c.score >= candidates[0].score - 1.5).slice(0, 8)) {
    const { shade, score: shadeScore } = bestShade(db.shades.get(c.p.id) ?? [], st);
    const total = c.score + (shade ? shadeScore * 1.5 : 0);
    if (!best || total > best.score) best = { p: c.p, score: total, shade };
  }
  return {
    product: best!.p,
    shade: best!.shade,
    confidence: Math.min(1, best!.score / 6),
  };
}

function bestShade(shades: Shade[], st: Set<string>) {
  let shade: Shade | undefined;
  let score = 0;
  for (const s of shades) {
    const lt = tokens(s.label);
    if (!lt.length) continue;
    const hits = lt.filter((t) => st.has(t)).length;
    // shade codes like "240" or "2n1" are strong evidence on their own
    const codeHit = lt.some((t) => /\d/.test(t) && st.has(t));
    const sc = hits / lt.length + (codeHit ? 1 : 0);
    if (sc > score) {
      score = sc;
      shade = s;
    }
  }
  return score >= 0.5 ? { shade, score } : { shade: undefined, score: 0 };
}

// ---------- ranking ----------

export type MatchInput = {
  target: Lab;
  undertoneAxis: number;
  olive: boolean;
  finish?: Finish;
  coverage?: Coverage;
  skinType?: string;
  acneProne?: boolean;
  budget: number;
  quality: number;
  liked: Set<string>;
  /** productId -> reason it's out (non-shade problems like breakouts) */
  avoid: Map<string, string>;
};

export type FoundationMatch = {
  product: FoundationProduct;
  shade: Shade;
  deltaE: number;
  alternatives: Shade[];
  score: number;
  reasons: string[];
  cautions: string[];
};

export function matchLabel(dE: number) {
  if (dE < 3) return "Excellent match";
  if (dE < 5.5) return "Very close";
  if (dE < 9) return "Close — swatch first";
  return "Nearest available";
}

export function rankFoundations(db: FoundationDb, input: MatchInput): FoundationMatch[] {
  const out: FoundationMatch[] = [];
  for (const product of db.products) {
    const shades = db.shades.get(product.id) ?? [];
    const scored = shades
      .map((s) => {
        const dE = deltaE2000(input.target, s.lab);
        let ut = 0;
        if (s.undertone) {
          ut = Math.abs(UNDERTONE_AXIS[s.undertone] - input.undertoneAxis) * 1.6;
          if (input.olive && s.undertone === "O") ut -= 1.5;
        }
        return { s, dE, total: dE + ut };
      })
      .sort((a, b) => a.total - b.total);
    if (!scored.length) continue;
    const best = scored[0];
    const reasons: string[] = [];
    const cautions: string[] = [];
    let score = best.total;

    if (input.finish && input.finish !== product.finish) {
      const opposite =
        (input.finish === "matte" && product.finish === "radiant") ||
        (input.finish === "radiant" && product.finish === "matte");
      score += opposite ? 3 : 1.5;
    } else if (input.finish) reasons.push(`${product.finish} finish, like you asked for`);

    if (input.coverage && input.coverage !== product.coverage) {
      score += Math.abs(["light", "medium", "full"].indexOf(input.coverage) - ["light", "medium", "full"].indexOf(product.coverage)) * 1.5;
    } else if (input.coverage) reasons.push(`${product.coverage} coverage`);

    if (input.skinType === "oily") {
      if (product.finish === "matte") {
        score -= 1;
        reasons.push("oil-controlling finish suits oily skin");
      } else if (product.finish === "radiant") score += 1.5;
    }
    if (input.skinType === "dry") {
      if (product.finish === "radiant" || product.form === "tint") {
        score -= 1;
        reasons.push("hydrating finish suits dry skin");
      } else if (product.finish === "matte" || product.form === "powder") {
        score += 1.5;
        cautions.push("Matte formulas can cling to dry patches — prep with moisturizer.");
      }
    }
    if (input.acneProne && /acne|clear|blemish|pore/i.test(product.name)) {
      score -= 1;
      reasons.push("formulated with breakout-prone skin in mind");
    }

    const price = TIER_PRICE[product.tier];
    if (price > input.budget) score += Math.min(8, ((price - input.budget) / input.budget) * 6);
    score -= ((input.quality - 50) / 50) * (product.tier - 2.5) * 1.2;

    if (input.liked.has(product.id)) {
      score -= 3;
      reasons.unshift("you've liked this formula before");
    }
    const avoid = input.avoid.get(product.id);
    if (avoid) {
      score += 12;
      cautions.unshift(avoid);
    }

    const alternatives = scored
      .slice(1)
      .filter((x) => x.dE < best.dE + 4)
      .slice(0, 2)
      .map((x) => x.s);

    out.push({ product, shade: best.s, deltaE: best.dE, alternatives, score, reasons, cautions });
  }
  return out.sort((a, b) => a.score - b.score);
}
