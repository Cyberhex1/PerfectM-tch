/**
 * Ingredient parsing, a small knowledge base of common irritants, and personal
 * pattern-finding across the products someone has logged.
 *
 * This is general cosmetic-chemistry guidance, not medical advice. Most "irritants"
 * here are fine for most people — they're flagged because they're common culprits
 * when skin does react.
 */
import type { Profile, ProductEntry, QuizAnswers, Reaction } from "./types";

export type Family =
  | "fragrance"
  | "essential-oil"
  | "drying-alcohol"
  | "sulfate"
  | "preservative-allergen"
  | "exfoliant-acid"
  | "retinoid"
  | "benzoyl-peroxide"
  | "vitamin-c"
  | "pore-clogging"
  | "chemical-filter"
  | "lanolin"
  | "other-allergen";

export const FAMILY_LABEL: Record<Family, string> = {
  fragrance: "Fragrance",
  "essential-oil": "Essential oils",
  "drying-alcohol": "Drying alcohols",
  sulfate: "Harsh sulfates",
  "preservative-allergen": "Allergenic preservatives",
  "exfoliant-acid": "Exfoliating acids",
  retinoid: "Retinoids",
  "benzoyl-peroxide": "Benzoyl peroxide",
  "vitamin-c": "L-ascorbic acid (vitamin C)",
  "pore-clogging": "Can clog pores",
  "chemical-filter": "Sensitizing sunscreen filters",
  lanolin: "Lanolin",
  "other-allergen": "Known contact allergens",
};

type Rule = {
  family: Family;
  match: RegExp;
  /** base concern level for anyone */
  base: 0 | 1 | 2;
  why: string;
};

/**
 * Order matters a little: the first matching rule wins for each ingredient.
 * Patterns run against normalised ingredient names (lowercase, single spaces).
 */
const RULES: Rule[] = [
  {
    family: "preservative-allergen",
    match: /^(methylchloroisothiazolinone|methylisothiazolinone|mci|mit)$/,
    base: 2,
    why: "Isothiazolinone preservatives are among the most common causes of cosmetic contact allergy.",
  },
  {
    family: "preservative-allergen",
    match: /^(dmdm hydantoin|imidazolidinyl urea|diazolidinyl urea|quaternium 15|2 bromo 2 nitropropane 1 3 diol|bronopol|sodium hydroxymethylglycinate)$/,
    base: 1,
    why: "A formaldehyde-releasing preservative — a frequent trigger for people with sensitive or allergy-prone skin.",
  },
  {
    family: "fragrance",
    match: /^(fragrance|parfum|perfume|aroma|flavor|flavour)$/,
    base: 1,
    why: "Fragrance is the #1 cause of cosmetic skin reactions, and the label hides what's in the blend.",
  },
  {
    family: "fragrance",
    match: /^(linalool|limonene|d limonene|citronellol|geraniol|eugenol|isoeugenol|coumarin|citral|cinnamal|cinnamyl alcohol|hexyl cinnamal|amyl cinnamal|benzyl benzoate|benzyl salicylate|benzyl cinnamate|farnesol|hydroxycitronellal|alpha isomethyl ionone|butylphenyl methylpropional|anise alcohol|evernia prunastri extract|evernia furfuracea extract)$/,
    base: 1,
    why: "A labelled fragrance allergen (EU-listed) — often from added fragrance or essential oils.",
  },
  {
    family: "essential-oil",
    match: /\b(lavandula|lavender|mentha|peppermint|spearmint|eucalyptus|melaleuca|tea tree|citrus|bergamot|lemon|orange|grapefruit|lime|rosmarinus|rosemary|cananga|ylang ylang|eugenia caryophyllus|clove|cinnamomum|cinnamon|pelargonium|geranium|juniperus|cymbopogon|lemongrass|salvia sclarea|clary sage|origanum|thymus|thyme|santalum|sandalwood|rosa damascena|jasminum|jasmine|pogostemon|patchouli|cedrus|cedarwood|chamomilla recutita|anthemis nobilis|ocimum|basil)\b.*\boil\b/,
    base: 1,
    why: "Essential oils smell nice but contain fragrance compounds that commonly irritate sensitive skin.",
  },
  {
    family: "essential-oil",
    match: /^(menthol|camphor|menthyl lactate)$/,
    base: 1,
    why: "Gives a cooling tingle — which is actually mild irritation for sensitive skin.",
  },
  {
    family: "drying-alcohol",
    match: /^(alcohol denat|denatured alcohol|sd alcohol( \w+)*|alcohol|ethanol|ethyl alcohol|isopropyl alcohol)$/,
    base: 1,
    why: "Volatile alcohol high in a formula can dry and sensitize skin, especially if you're dry or reactive.",
  },
  {
    family: "other-allergen",
    match: /^(hamamelis virginiana( \w+)*|witch hazel( \w+)*)$/,
    base: 0,
    why: "Witch hazel is astringent and some preparations contain alcohol — can sting reactive skin.",
  },
  {
    family: "sulfate",
    match: /^(sodium lauryl sulfate|ammonium lauryl sulfate|sodium laureth sulfate|ammonium laureth sulfate|sls|sles)$/,
    base: 1,
    why: "Strong cleansing surfactants that can strip the skin barrier (SLS especially).",
  },
  {
    family: "retinoid",
    match: /^(retinol|retinal|retinaldehyde|retinyl palmitate|retinyl acetate|retinyl retinoate|hydroxypinacolone retinoate|tretinoin|adapalene|tazarotene)$/,
    base: 0,
    why: "Powerful anti-aging/acne active; can cause dryness and peeling while skin adjusts.",
  },
  {
    family: "exfoliant-acid",
    match: /^(glycolic acid|lactic acid|mandelic acid|salicylic acid|malic acid|tartaric acid|beta hydroxy acid|betaine salicylate|gluconolactone)$/,
    base: 0,
    why: "Exfoliating acid — great for texture and breakouts, but can sting sensitive or compromised skin.",
  },
  {
    family: "benzoyl-peroxide",
    match: /^benzoyl peroxide$/,
    base: 0,
    why: "Effective acne treatment that commonly causes dryness and irritation (and bleaches fabric).",
  },
  {
    family: "vitamin-c",
    match: /^(ascorbic acid|l ascorbic acid)$/,
    base: 0,
    why: "Pure vitamin C is acidic and can tingle or irritate sensitive skin at high strengths.",
  },
  {
    family: "pore-clogging",
    match: /^(cocos nucifera oil|coconut oil|isopropyl myristate|isopropyl palmitate|isopropyl isostearate|myristyl myristate|laureth 4|theobroma cacao seed butter|cocoa butter|triticum vulgare germ oil|wheat germ oil|acetylated lanolin|ethylhexyl palmitate|octyl palmitate|isostearyl isostearate)$/,
    base: 0,
    why: "Rated as potentially pore-clogging. Ratings are rough, but worth noting if you break out easily.",
  },
  {
    family: "chemical-filter",
    match: /^(oxybenzone|benzophenone 3|octocrylene|methylene bis benzotriazolyl tetramethylbutylphenol|avobenzone|butyl methoxydibenzoylmethane|homosalate)$/,
    base: 0,
    why: "Some people find this UV filter stings or irritates (especially around the eyes).",
  },
  {
    family: "lanolin",
    match: /^(lanolin|lanolin alcohol|lanolin oil|wool wax|wool wax alcohol)$/,
    base: 0,
    why: "Lanolin is a known contact allergen for a minority of people.",
  },
  {
    family: "other-allergen",
    match: /^(propylene glycol|cocamidopropyl betaine|propolis|propolis extract|tocopheryl acetate|benzyl alcohol)$/,
    base: 0,
    why: "Generally well tolerated, but a recognised contact allergen for some people.",
  },
];

/** Near-universal formula bases — too common to blame on their own. */
const UBIQUITOUS = new Set([
  "water", "aqua", "glycerin", "butylene glycol", "dimethicone", "phenoxyethanol", "xanthan gum",
  "sodium hydroxide", "citric acid", "ethylhexylglycerin", "disodium edta", "caprylyl glycol",
  "carbomer", "tocopherol", "cetearyl alcohol", "cetyl alcohol", "stearyl alcohol", "glyceryl stearate",
  "sodium hyaluronate", "hyaluronic acid", "niacinamide", "panthenol", "squalane", "titanium dioxide",
  "iron oxides", "ci 77891", "ci 77491", "ci 77492", "ci 77499", "mica", "silica", "pentylene glycol",
  "1 2 hexanediol", "hexylene glycol", "propanediol", "caprylic capric triglyceride", "allantoin",
  "sodium benzoate", "potassium sorbate", "triethanolamine", "tromethamine", "peg 100 stearate",
  "cyclopentasiloxane", "isododecane", "sorbitan isostearate", "polysorbate 20", "polysorbate 80",
  "trisodium ethylenediamine disuccinate", "chlorphenesin", "ceramide np", "cholesterol",
]);

const ALIASES: Record<string, string> = {
  aqua: "water",
  "aqua water": "water",
  "water aqua": "water",
  "aqua eau": "water",
  "water aqua eau": "water",
  eau: "water",
  parfum: "fragrance",
  "parfum fragrance": "fragrance",
  "fragrance parfum": "fragrance",
  aroma: "fragrance",
  "alcohol denat.": "alcohol denat",
  "denatured alcohol": "alcohol denat",
  "glycerine": "glycerin",
  "vitamin e": "tocopherol",
  "tocopheryl acetate vitamin e": "tocopheryl acetate",
  "sodium lauryl sulphate": "sodium lauryl sulfate",
  "sodium laureth sulphate": "sodium laureth sulfate",
  "ci 77891 titanium dioxide": "titanium dioxide",
  "titanium dioxide ci 77891": "titanium dioxide",
  "l ascorbic acid": "ascorbic acid",
  "hyaluronic acid": "sodium hyaluronate",
  "methylisothiazolinone mi": "methylisothiazolinone",
  "methylchloroisothiazolinone mci": "methylchloroisothiazolinone",
  // botanical INCI names → the common names people type
  "cocos nucifera oil": "coconut oil",
  "butyrospermum parkii butter": "shea butter",
  "butyrospermum parkii": "shea butter",
  "theobroma cacao seed butter": "cocoa butter",
  "simmondsia chinensis seed oil": "jojoba oil",
  "aloe barbadensis leaf juice": "aloe vera",
  "melaleuca alternifolia leaf oil": "tea tree oil",
  "lavandula angustifolia oil": "lavender oil",
  "triticum vulgare germ oil": "wheat germ oil",
};

export const normalizeIngredient = (raw: string) => {
  const n = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\*+/g, "")
    .replace(/\b\d+(\.\d+)?\s?%/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ALIASES[n] ?? n;
};

/** Split an INCI list. Handles "may contain" blocks, slashes and parenthetical synonyms. */
export function parseIngredients(text: string): string[] {
  if (!text) return [];
  let t = text.replace(/\r?\n/g, ", ");
  t = t.replace(/^\s*(ingredients|inci|active ingredients?|inactive ingredients?)\s*:\s*/gi, "");
  t = t.replace(/[[(]\s*\+\s*\/\s*-\s*:?\s*([^\])]*)[\])]/g, ", $1");
  t = t.replace(/\+\s*\/\s*-|may contain\s*:?/gi, ", ");
  t = t.replace(/(inactive|active) ingredients?\s*:/gi, ", ");
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const c of t) {
    if (c === "(" || c === "[") depth++;
    if (c === ")" || c === "]") depth = Math.max(0, depth - 1);
    if ((c === "," || c === ";" || c === "•" || c === "·") && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);

  const result: string[] = [];
  for (const part of out) {
    let trimmed = part.replace(/\.$/, "").trim();
    if (!trimmed || trimmed.length > 120) continue;
    // "Citrus Aurantium Dulcis (Orange) Peel Oil" → drop the mid-name common name
    trimmed = trimmed.replace(/\s*\([^()]*\)\s*(?=\S)/g, " ").trim();
    // "Aqua/Water/Eau" → one ingredient; "Parfum (Fragrance)" → fragrance
    const paren = trimmed.match(/^(.*?)\s*\((.*)\)\s*$/);
    const candidates = paren ? [paren[1], paren[2]] : [trimmed];
    const names = candidates
      .flatMap((c) => c.split("/"))
      .map(normalizeIngredient)
      .filter(Boolean)
      // prefer real names over colour-index codes
      .sort((a, b) => Number(/^ci \d/.test(a)) - Number(/^ci \d/.test(b)));
    if (!names.length) continue;
    const known = names.find((n) => ruleFor(n)) ?? names.find((n) => ALIASES[n] || UBIQUITOUS.has(n));
    const pick = normalizeIngredient(known ?? names[0]);
    if (!result.includes(pick)) result.push(pick);
  }
  return result;
}

const ruleCache = new Map<string, Rule | null>();
export function ruleFor(ingredient: string): Rule | null {
  if (!ruleCache.has(ingredient)) ruleCache.set(ingredient, RULES.find((r) => r.match.test(ingredient)) ?? null);
  return ruleCache.get(ingredient)!;
}

export const familyOf = (ingredient: string): Family | null => ruleFor(ingredient)?.family ?? null;

const SKIN_REACTIONS: Reaction[] = ["breakout", "irritation", "redness", "itching", "dryness"];

/** Weight of evidence a logged product provides against its ingredients. */
function reactionWeight(p: ProductEntry) {
  if (p.verdict !== "disliked") return 0;
  const skin = p.reactions.filter((r) => SKIN_REACTIONS.includes(r));
  if (!skin.length) {
    // disliked only because of shade or texture — says nothing about ingredients
    if (p.reactions.length) return 0;
    return 0.5;
  }
  return 1 + 0.25 * (skin.length - 1);
}

export type PersonalSignal = {
  key: string;
  label: string;
  kind: "ingredient" | "family";
  dislikedWeight: number;
  dislikedProducts: string[];
  likedProducts: string[];
  /** 0–1 */
  suspicion: number;
  reactions: Reaction[];
};

/**
 * Look for ingredients (and ingredient families) that keep turning up in products
 * that caused problems, and not in products that worked.
 */
export function personalSignals(profile: Pick<Profile, "products" | "cleared">): PersonalSignal[] {
  const stats = new Map<string, PersonalSignal>();
  const touch = (key: string, label: string, kind: PersonalSignal["kind"]) => {
    if (!stats.has(key))
      stats.set(key, { key, label, kind, dislikedWeight: 0, dislikedProducts: [], likedProducts: [], suspicion: 0, reactions: [] });
    return stats.get(key)!;
  };

  for (const p of profile.products) {
    if (!p.ingredients) continue;
    const ings = parseIngredients(p.ingredients);
    const w = reactionWeight(p);
    const fams = new Set<Family>();
    const pname = [p.brand, p.name].filter(Boolean).join(" ");
    for (const ing of ings) {
      const fam = familyOf(ing);
      if (fam) fams.add(fam === "essential-oil" ? "fragrance" : fam);
      if (UBIQUITOUS.has(ing)) continue;
      const s = touch(`i:${ing}`, ing, "ingredient");
      if (p.verdict === "liked") s.likedProducts.push(pname);
      if (w > 0) {
        s.dislikedWeight += w;
        s.dislikedProducts.push(pname);
        for (const r of p.reactions) if (!s.reactions.includes(r)) s.reactions.push(r);
      }
    }
    for (const fam of fams) {
      const s = touch(`f:${fam}`, FAMILY_LABEL[fam], "family");
      if (p.verdict === "liked") s.likedProducts.push(pname);
      if (w > 0) {
        s.dislikedWeight += w;
        s.dislikedProducts.push(pname);
        for (const r of p.reactions) if (!s.reactions.includes(r)) s.reactions.push(r);
      }
    }
  }

  const cleared = new Set(profile.cleared.map(normalizeIngredient));
  const out: PersonalSignal[] = [];
  for (const s of stats.values()) {
    if (s.kind === "ingredient" && cleared.has(s.label)) continue;
    if (s.kind === "family" && cleared.has(`family:${s.key.slice(2)}`)) continue;
    const liked = s.likedProducts.length;
    // Laplace-smoothed share of evidence pointing at "problem", scaled by how much evidence exists
    const share = (s.dislikedWeight + 0.25) / (s.dislikedWeight + liked + 1);
    const volume = Math.min(1, s.dislikedWeight / 2);
    const isKnown = s.kind === "family" || !!ruleFor(s.label);
    s.suspicion = Math.min(1, share * volume * (isKnown ? 1.25 : 1));
    // one bad product is only suspicious for ingredients already known to cause trouble
    const enough = s.dislikedWeight >= 2 || (isKnown && s.dislikedWeight >= 1);
    if (enough && s.suspicion >= 0.4 && liked <= s.dislikedProducts.length / 2) out.push(s);
  }
  return out.sort((a, b) => b.suspicion - a.suspicion);
}

export type Warning = {
  ingredient: string;
  family?: Family;
  level: "high" | "medium" | "low";
  reasons: string[];
};

/** How much this person should care about an ingredient family, given their answers. */
function profileBoost(fam: Family, quiz: QuizAnswers): { boost: number; why?: string } {
  const sensitive = quiz.sensitivity === "very" || quiz.concerns.includes("rosacea") || quiz.concerns.includes("eczema");
  const somewhat = quiz.sensitivity === "somewhat";
  switch (fam) {
    case "fragrance":
    case "essential-oil":
      if (quiz.avoidFragrance) return { boost: 2, why: "You said you avoid fragrance." };
      if (sensitive) return { boost: 1, why: "You told us your skin is sensitive." };
      if (somewhat) return { boost: 0.5 };
      return { boost: 0 };
    case "drying-alcohol":
      if (quiz.skinType === "dry" || sensitive) return { boost: 1, why: quiz.skinType === "dry" ? "Your skin runs dry." : "Your skin is sensitive." };
      return { boost: 0 };
    case "sulfate":
      return quiz.skinType === "dry" || sensitive ? { boost: 1, why: "Strong cleansers can aggravate dry or reactive skin." } : { boost: 0 };
    case "pore-clogging":
      return quiz.acneProne || quiz.concerns.includes("acne") ? { boost: 1.5, why: "You're breakout-prone." } : { boost: -1 };
    case "retinoid":
      if (quiz.pregnant) return { boost: 2.5, why: "Retinoids are generally avoided during pregnancy and breastfeeding — check with your doctor." };
      return sensitive ? { boost: 1, why: "Go slowly — your skin is sensitive." } : { boost: 0 };
    case "exfoliant-acid":
    case "benzoyl-peroxide":
    case "vitamin-c":
      return sensitive ? { boost: 1, why: "Strong actives can sting sensitive skin — patch test first." } : { boost: -0.5 };
    case "chemical-filter":
      return sensitive ? { boost: 0.5, why: "Mineral (zinc/titanium) sunscreens are usually gentler on reactive skin." } : { boost: -0.5 };
    default:
      return sensitive ? { boost: 0.5 } : { boost: 0 };
  }
}

const LEVELS: Warning["level"][] = ["low", "medium", "high"];
const levelFrom = (n: number): Warning["level"] | null => (n >= 2.5 ? "high" : n >= 1.5 ? "medium" : n >= 0.75 ? "low" : null);

/** Check an ingredient list against everything we know about this person. */
export function checkIngredients(text: string, profile: Profile, signals = personalSignals(profile)): Warning[] {
  const ings = parseIngredients(text);
  const cleared = new Set(profile.cleared.map(normalizeIngredient));
  const avoid = new Set([...profile.watchlist, ...profile.quiz.allergies].map(normalizeIngredient));
  const sigByIng = new Map(signals.filter((s) => s.kind === "ingredient").map((s) => [s.label, s]));
  const sigByFam = new Map(signals.filter((s) => s.kind === "family").map((s) => [s.key.slice(2), s]));
  const out: Warning[] = [];

  ings.forEach((ing, position) => {
    if (cleared.has(ing)) return;
    const reasons: string[] = [];
    let score = 0;
    const rule = ruleFor(ing);
    const famKey = rule ? (rule.family === "essential-oil" ? "fragrance" : rule.family) : null;

    const avoidHit = [...avoid].find((a) => a && (ing === a || ing.includes(a)));
    if (avoidHit) {
      score += 3;
      reasons.push(`It's on your avoid list (“${avoidHit}”).`);
    }
    const sig = sigByIng.get(ing);
    if (sig) {
      score += 1.5 + sig.suspicion * 1.5;
      reasons.push(
        `It was in ${sig.dislikedProducts.length} product${sig.dislikedProducts.length > 1 ? "s" : ""} that didn't work for you (${sig.dislikedProducts.slice(0, 3).join(", ")})${sig.likedProducts.length ? "" : " and none you liked"}.`,
      );
    }
    if (rule) {
      const famSig = famKey && !cleared.has(`family:${famKey}`) ? sigByFam.get(famKey) : undefined;
      if (famSig && !sig) {
        score += 1 + famSig.suspicion;
        reasons.push(
          `${FAMILY_LABEL[famKey as Family]} showed up in ${famSig.dislikedProducts.length} product${famSig.dislikedProducts.length > 1 ? "s" : ""} that gave you trouble.`,
        );
      }
      const { boost, why } = profileBoost(rule.family, profile.quiz);
      score += rule.base * 0.75 + boost;
      // drying alcohol only matters when it's high on the list
      if (rule.family === "drying-alcohol" && position > 6) score -= 1;
      if (score > 0.5) {
        reasons.push(rule.why);
        if (why) reasons.push(why);
      }
    }
    const level = levelFrom(score);
    if (level && reasons.length) out.push({ ingredient: ing, family: rule?.family, level, reasons });
  });

  return out.sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level));
}

/** Families to steer clear of when picking products for this person. */
export function familiesToAvoid(profile: Profile, signals = personalSignals(profile)): Set<Family> {
  const out = new Set<Family>();
  const q = profile.quiz;
  if (q.avoidFragrance || q.sensitivity === "very" || q.concerns.includes("rosacea") || q.concerns.includes("eczema")) {
    out.add("fragrance");
    out.add("essential-oil");
  }
  if (q.acneProne || q.concerns.includes("acne")) out.add("pore-clogging");
  if (q.pregnant) out.add("retinoid");
  for (const s of signals) {
    if (s.kind === "family" && s.suspicion >= 0.5) {
      const fam = s.key.slice(2) as Family;
      out.add(fam);
      if (fam === "fragrance") out.add("essential-oil");
    }
  }
  return out;
}
