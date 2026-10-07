import { familiesToAvoid, personalSignals, type Family } from "./ingredients";
import { normalize } from "./foundations";
import type { ConcernKey, Depth, Profile, SkinType } from "./types";

export type Step = "cleanser" | "treatment" | "exfoliant" | "moisturizer" | "sunscreen" | "spot";

export type CatalogItem = {
  id: string;
  brand: string;
  name: string;
  step: Step;
  /** approximate US retail price */
  price: number;
  keyIngredients: string[];
  skinTypes: SkinType[];
  goodFor: (ConcernKey | "sensitive")[];
  /** ingredient families it contains (as far as we know) */
  contains: Family[];
  fragranceFree?: boolean;
  mineral?: boolean;
  note?: string;
};

const ALL: SkinType[] = ["dry", "normal", "combination", "oily"];

/**
 * A small hand-picked catalog of widely available, well-regarded products.
 * Prices are approximate and formulas change — the UI tells people to check the
 * current ingredient list (and offers an Open Beauty Facts lookup).
 */
export const CATALOG: CatalogItem[] = [
  // Cleansers
  { id: "cerave-hydrating-cleanser", brand: "CeraVe", name: "Hydrating Facial Cleanser", step: "cleanser", price: 16, keyIngredients: ["ceramides", "hyaluronic acid"], skinTypes: ["dry", "normal"], goodFor: ["dryness", "eczema", "sensitive", "redness"], contains: [], fragranceFree: true },
  { id: "cerave-foaming-cleanser", brand: "CeraVe", name: "Foaming Facial Cleanser", step: "cleanser", price: 16, keyIngredients: ["niacinamide", "ceramides"], skinTypes: ["normal", "combination", "oily"], goodFor: ["oiliness", "acne"], contains: [], fragranceFree: true },
  { id: "vanicream-cleanser", brand: "Vanicream", name: "Gentle Facial Cleanser", step: "cleanser", price: 10, keyIngredients: ["no common irritants"], skinTypes: ALL, goodFor: ["sensitive", "rosacea", "eczema", "redness"], contains: [], fragranceFree: true },
  { id: "lrp-toleriane-cleanser", brand: "La Roche-Posay", name: "Toleriane Hydrating Gentle Cleanser", step: "cleanser", price: 17, keyIngredients: ["ceramide-3", "niacinamide", "glycerin"], skinTypes: ["dry", "normal", "combination"], goodFor: ["dryness", "sensitive", "redness"], contains: [], fragranceFree: true },
  { id: "lrp-effaclar-gel", brand: "La Roche-Posay", name: "Effaclar Medicated Gel Cleanser", step: "cleanser", price: 17, keyIngredients: ["2% salicylic acid"], skinTypes: ["combination", "oily"], goodFor: ["acne", "oiliness", "texture"], contains: ["exfoliant-acid"] },
  { id: "cerave-acne-cleanser", brand: "CeraVe", name: "Acne Foaming Cream Cleanser", step: "cleanser", price: 17, keyIngredients: ["4% benzoyl peroxide", "niacinamide"], skinTypes: ["normal", "combination", "oily"], goodFor: ["acne"], contains: ["benzoyl-peroxide"], fragranceFree: true, note: "Benzoyl peroxide bleaches towels and pillowcases." },
  { id: "dermalogica-ultracalming", brand: "Dermalogica", name: "UltraCalming Cleanser", step: "cleanser", price: 42, keyIngredients: ["soap-free gel-cream texture"], skinTypes: ALL, goodFor: ["sensitive", "redness", "rosacea"], contains: [] },

  // Treatments / serums
  { id: "to-niacinamide", brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", step: "treatment", price: 6, keyIngredients: ["niacinamide", "zinc PCA"], skinTypes: ["normal", "combination", "oily"], goodFor: ["oiliness", "acne", "texture", "uneven-tone"], contains: [], note: "10% niacinamide is strong — some people do better with 4–5%." },
  { id: "to-azelaic", brand: "The Ordinary", name: "Azelaic Acid Suspension 10%", step: "treatment", price: 12, keyIngredients: ["azelaic acid"], skinTypes: ALL, goodFor: ["redness", "rosacea", "acne", "hyperpigmentation", "uneven-tone"], contains: [], note: "Can tingle for the first week or two." },
  { id: "to-ha", brand: "The Ordinary", name: "Hyaluronic Acid 2% + B5", step: "treatment", price: 9, keyIngredients: ["hyaluronic acid", "panthenol"], skinTypes: ALL, goodFor: ["dryness", "fine-lines", "dullness"], contains: [], note: "Apply to damp skin and seal with moisturizer." },
  { id: "good-molecules-discoloration", brand: "Good Molecules", name: "Discoloration Correcting Serum", step: "treatment", price: 12, keyIngredients: ["tranexamic acid", "niacinamide"], skinTypes: ALL, goodFor: ["hyperpigmentation", "uneven-tone", "dullness"], contains: [] },
  { id: "timeless-vitc", brand: "Timeless", name: "20% Vitamin C + E Ferulic Acid Serum", step: "treatment", price: 30, keyIngredients: ["L-ascorbic acid", "vitamin E", "ferulic acid"], skinTypes: ["normal", "combination", "oily"], goodFor: ["dullness", "hyperpigmentation", "fine-lines", "uneven-tone"], contains: ["vitamin-c"], note: "Use in the morning under sunscreen. Store away from light." },
  { id: "skinceuticals-cef", brand: "SkinCeuticals", name: "C E Ferulic", step: "treatment", price: 185, keyIngredients: ["15% L-ascorbic acid", "vitamin E", "ferulic acid"], skinTypes: ["normal", "combination", "dry"], goodFor: ["dullness", "hyperpigmentation", "fine-lines"], contains: ["vitamin-c"] },
  { id: "skin1004-centella", brand: "SKIN1004", name: "Madagascar Centella Ampoule", step: "treatment", price: 20, keyIngredients: ["centella asiatica"], skinTypes: ALL, goodFor: ["redness", "sensitive", "rosacea"], contains: [] },
  { id: "differin", brand: "Differin", name: "Adapalene Gel 0.1%", step: "treatment", price: 15, keyIngredients: ["adapalene (retinoid)"], skinTypes: ["normal", "combination", "oily"], goodFor: ["acne", "texture"], contains: ["retinoid"], fragranceFree: true, note: "Nighttime only. Start 2–3 nights a week." },
  { id: "cerave-retinol", brand: "CeraVe", name: "Resurfacing Retinol Serum", step: "treatment", price: 20, keyIngredients: ["encapsulated retinol", "niacinamide", "licorice root"], skinTypes: ALL, goodFor: ["texture", "hyperpigmentation", "fine-lines", "acne"], contains: ["retinoid"], fragranceFree: true, note: "Nighttime only. Start slowly." },
  { id: "pc-retinol", brand: "Paula's Choice", name: "1% Retinol Treatment", step: "treatment", price: 65, keyIngredients: ["1% retinol", "peptides", "vitamin C"], skinTypes: ["normal", "combination", "oily"], goodFor: ["fine-lines", "texture", "uneven-tone"], contains: ["retinoid"], fragranceFree: true, note: "A strong retinol — not a first retinoid for sensitive skin." },

  // Exfoliants
  { id: "pc-bha", brand: "Paula's Choice", name: "Skin Perfecting 2% BHA Liquid Exfoliant", step: "exfoliant", price: 35, keyIngredients: ["2% salicylic acid"], skinTypes: ["normal", "combination", "oily"], goodFor: ["acne", "oiliness", "texture"], contains: ["exfoliant-acid"], fragranceFree: true },
  { id: "to-glycolic", brand: "The Ordinary", name: "Glycolic Acid 7% Exfoliating Toner", step: "exfoliant", price: 13, keyIngredients: ["glycolic acid"], skinTypes: ["normal", "combination", "oily"], goodFor: ["texture", "dullness", "uneven-tone"], contains: ["exfoliant-acid"] },

  // Moisturizers
  { id: "cerave-cream", brand: "CeraVe", name: "Moisturizing Cream", step: "moisturizer", price: 19, keyIngredients: ["ceramides", "hyaluronic acid", "petrolatum"], skinTypes: ["dry", "normal"], goodFor: ["dryness", "eczema", "sensitive"], contains: [], fragranceFree: true },
  { id: "cerave-pm", brand: "CeraVe", name: "PM Facial Moisturizing Lotion", step: "moisturizer", price: 17, keyIngredients: ["niacinamide", "ceramides"], skinTypes: ALL, goodFor: ["oiliness", "redness", "acne"], contains: [], fragranceFree: true },
  { id: "vanicream-cream", brand: "Vanicream", name: "Moisturizing Cream", step: "moisturizer", price: 15, keyIngredients: ["no common irritants"], skinTypes: ["dry", "normal"], goodFor: ["dryness", "eczema", "sensitive", "rosacea"], contains: [], fragranceFree: true },
  { id: "lrp-double-repair", brand: "La Roche-Posay", name: "Toleriane Double Repair Face Moisturizer", step: "moisturizer", price: 24, keyIngredients: ["ceramide-3", "niacinamide", "glycerin"], skinTypes: ALL, goodFor: ["sensitive", "redness", "dryness"], contains: [], fragranceFree: true },
  { id: "clinique-ddmg", brand: "Clinique", name: "Dramatically Different Moisturizing Gel", step: "moisturizer", price: 32, keyIngredients: ["lightweight humectants"], skinTypes: ["combination", "oily"], goodFor: ["oiliness"], contains: [], fragranceFree: true },
  { id: "neutrogena-hydro-boost", brand: "Neutrogena", name: "Hydro Boost Water Gel", step: "moisturizer", price: 22, keyIngredients: ["hyaluronic acid"], skinTypes: ["normal", "combination", "oily"], goodFor: ["oiliness", "dullness"], contains: ["fragrance"], note: "The original version contains fragrance." },
  { id: "lrp-cicaplast", brand: "La Roche-Posay", name: "Cicaplast Baume B5", step: "moisturizer", price: 17, keyIngredients: ["panthenol", "madecassoside", "shea butter"], skinTypes: ["dry", "normal"], goodFor: ["dryness", "eczema", "redness", "sensitive"], contains: [], fragranceFree: true, note: "Rich — great as a night cream or on dry patches." },
  { id: "fab-ultra-repair", brand: "First Aid Beauty", name: "Ultra Repair Cream", step: "moisturizer", price: 40, keyIngredients: ["colloidal oatmeal", "shea butter"], skinTypes: ["dry", "normal"], goodFor: ["dryness", "eczema"], contains: ["essential-oil"], note: "Contains eucalyptus oil." },
  { id: "de-protini", brand: "Drunk Elephant", name: "Protini Polypeptide Cream", step: "moisturizer", price: 68, keyIngredients: ["signal peptides", "amino acids"], skinTypes: ["normal", "combination", "dry"], goodFor: ["fine-lines", "dullness"], contains: [], fragranceFree: true },
  { id: "tatcha-water-cream", brand: "Tatcha", name: "The Water Cream", step: "moisturizer", price: 72, keyIngredients: ["Japanese botanicals", "lightweight gel"], skinTypes: ["combination", "oily"], goodFor: ["oiliness", "texture"], contains: ["fragrance"] },

  // Sunscreens
  { id: "eltamd-uv-clear", brand: "EltaMD", name: "UV Clear Broad-Spectrum SPF 46", step: "sunscreen", price: 41, keyIngredients: ["zinc oxide", "niacinamide"], skinTypes: ALL, goodFor: ["acne", "redness", "rosacea", "sensitive"], contains: [], fragranceFree: true },
  { id: "lrp-anthelios-milk", brand: "La Roche-Posay", name: "Anthelios Melt-in Milk SPF 60", step: "sunscreen", price: 37, keyIngredients: ["broad-spectrum chemical filters"], skinTypes: ["dry", "normal"], goodFor: ["dryness"], contains: ["chemical-filter"] },
  { id: "cerave-am-spf", brand: "CeraVe", name: "AM Facial Moisturizing Lotion SPF 30", step: "sunscreen", price: 17, keyIngredients: ["ceramides", "niacinamide"], skinTypes: ALL, goodFor: ["dryness", "sensitive"], contains: [], fragranceFree: true, note: "Moisturizer + SPF in one — handy for a minimal routine." },
  { id: "supergoop-unseen", brand: "Supergoop!", name: "Unseen Sunscreen SPF 40", step: "sunscreen", price: 38, keyIngredients: ["invisible gel", "chemical filters"], skinTypes: ["normal", "combination", "oily"], goodFor: ["oiliness", "texture"], contains: ["chemical-filter"], note: "Doubles as a smoothing makeup primer." },
  { id: "black-girl-sunscreen", brand: "Black Girl Sunscreen", name: "SPF 30", step: "sunscreen", price: 16, keyIngredients: ["chemical filters", "avocado", "jojoba"], skinTypes: ["dry", "normal", "combination"], goodFor: ["dryness"], contains: ["chemical-filter"], note: "No white cast on deeper skin." },
  { id: "boj-relief-sun", brand: "Beauty of Joseon", name: "Relief Sun: Rice + Probiotics SPF 50+", step: "sunscreen", price: 18, keyIngredients: ["rice extract", "modern UV filters"], skinTypes: ["dry", "normal", "combination"], goodFor: ["dryness", "dullness"], contains: [], note: "Lightweight, no white cast." },
  { id: "vanicream-spf", brand: "Vanicream", name: "Facial Moisturizer SPF 30", step: "sunscreen", price: 15, keyIngredients: ["zinc oxide"], skinTypes: ALL, goodFor: ["sensitive", "rosacea", "eczema"], contains: [], fragranceFree: true, mineral: true },

  // Spot treatments
  { id: "hero-mighty-patch", brand: "Hero Cosmetics", name: "Mighty Patch Original", step: "spot", price: 13, keyIngredients: ["hydrocolloid"], skinTypes: ALL, goodFor: ["acne", "sensitive"], contains: [] },
  { id: "lrp-effaclar-duo", brand: "La Roche-Posay", name: "Effaclar Duo Acne Spot Treatment", step: "spot", price: 30, keyIngredients: ["benzoyl peroxide"], skinTypes: ["normal", "combination", "oily"], goodFor: ["acne"], contains: ["benzoyl-peroxide"] },
];

export const STEP_LABEL: Record<Step, string> = {
  cleanser: "Cleanse",
  treatment: "Treat",
  exfoliant: "Exfoliate",
  moisturizer: "Moisturize",
  sunscreen: "Protect (SPF)",
  spot: "Spot treat",
};

export const LOOK_FOR: Partial<Record<ConcernKey, string[]>> = {
  acne: ["salicylic acid", "benzoyl peroxide", "adapalene", "azelaic acid", "niacinamide"],
  redness: ["azelaic acid", "niacinamide", "centella asiatica", "panthenol"],
  rosacea: ["azelaic acid", "niacinamide", "mineral sunscreen", "ceramides"],
  hyperpigmentation: ["vitamin C", "azelaic acid", "tranexamic acid", "retinoids", "daily SPF"],
  "uneven-tone": ["niacinamide", "vitamin C", "gentle AHAs", "daily SPF"],
  dryness: ["ceramides", "glycerin", "hyaluronic acid", "squalane", "petrolatum"],
  oiliness: ["niacinamide", "salicylic acid", "lightweight gel textures"],
  texture: ["AHAs (glycolic, lactic)", "salicylic acid", "retinoids"],
  "fine-lines": ["retinoids", "peptides", "daily SPF"],
  "dark-circles": ["caffeine", "vitamin C", "SPF around the eyes"],
  dullness: ["vitamin C", "AHAs", "hydration"],
  eczema: ["ceramides", "colloidal oatmeal", "petrolatum"],
};

export type Pick = { item: CatalogItem; why: string[]; caution?: string; liked: boolean };
export type RoutineStep = { step: Step; when: "AM" | "PM" | "AM & PM" | "As needed"; title: string; tip: string; picks: Pick[] };

const tierOf = (price: number) => (price < 20 ? 1 : price < 40 ? 2 : price < 60 ? 3 : 4);

function scoreItem(item: CatalogItem, profile: Profile, avoid: Set<Family>, depth: Depth | undefined, concerns: Set<string>) {
  const q = profile.quiz;
  const why: string[] = [];
  let caution: string | undefined;
  let s = 0;
  if (q.skinType && item.skinTypes.includes(q.skinType)) {
    s += 2;
    why.push(`suits ${q.skinType} skin`);
  } else if (q.skinType) s -= 3;
  const hits = item.goodFor.filter((g) => concerns.has(g));
  s += hits.length * 2;
  if (hits.length) why.push(`targets ${hits.map((h) => h.replace("-", " ")).join(", ")}`);
  if (item.fragranceFree && avoid.has("fragrance")) {
    s += 1;
    why.push("fragrance-free");
  }
  for (const fam of item.contains) if (avoid.has(fam)) return null;
  if (avoid.has("fragrance") && !item.fragranceFree && q.avoidFragrance) s -= 2;

  // budget & quality
  const { budget, quality } = profile.preferences;
  if (item.price > budget) s -= Math.min(6, ((item.price - budget) / Math.max(5, budget)) * 4);
  s += ((quality - 50) / 50) * (tierOf(item.price) - 2) * 0.8;

  if (item.mineral && depth && ["tan", "deep", "rich"].includes(depth))
    caution = "Mineral filters can leave a white cast on deeper skin — a tinted version helps.";
  if (item.contains.includes("retinoid") && q.sensitivity === "very")
    caution = "Retinoids can be rough on very sensitive skin — start once or twice a week and buffer with moisturizer.";
  return { s, why, caution };
}

function isLogged(profile: Profile, item: CatalogItem, verdict: "liked" | "disliked") {
  const target = normalize(`${item.brand} ${item.name}`);
  return profile.products.some((p) => {
    if (p.verdict !== verdict) return false;
    const n = normalize(`${p.brand ?? ""} ${p.name}`);
    const words = normalize(item.name).split(" ").filter((w) => w.length > 2);
    return n === target || (words.length > 0 && words.filter((w) => n.includes(w)).length >= Math.min(3, words.length) && n.includes(normalize(item.brand).split(" ")[0]));
  });
}

export function concernSet(profile: Profile) {
  const concerns = new Set<string>(profile.quiz.concerns);
  if (profile.quiz.acneProne) concerns.add("acne");
  if (profile.quiz.sensitivity && profile.quiz.sensitivity !== "not") concerns.add("sensitive");
  if (profile.quiz.skinType === "dry") concerns.add("dryness");
  if (profile.quiz.skinType === "oily") concerns.add("oiliness");
  for (const c of profile.photo?.concerns ?? []) if (c.score >= 0.5 && c.confidence !== "low") concerns.add(c.key);
  for (const c of profile.photo?.ai?.concerns ?? []) if (c.score >= 0.5) concerns.add(c.key);
  return concerns;
}

export function buildRoutine(profile: Profile, depth?: Depth): RoutineStep[] {
  const signals = personalSignals(profile);
  const avoid = familiesToAvoid(profile, signals);
  const concerns = concernSet(profile);
  const q = profile.quiz;
  const effort = q.routineEffort ?? "moderate";
  const sensitive = q.sensitivity === "very" || concerns.has("rosacea") || concerns.has("eczema");

  const pick = (step: Step, filter: (i: CatalogItem) => boolean = () => true, n = 2): Pick[] => {
    const scored = CATALOG.filter((i) => i.step === step && filter(i) && !isLogged(profile, i, "disliked"))
      .map((item) => {
        const r = scoreItem(item, profile, avoid, depth, concerns);
        if (!r) return null;
        const liked = isLogged(profile, item, "liked");
        return { item, s: r.s + (liked ? 5 : 0), why: r.why, caution: r.caution, liked };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.s - a.s);
    const out = scored.slice(0, 1);
    // second pick: a different price point for choice
    const alt = scored.slice(1).find((x) => Math.abs(tierOf(x.item.price) - tierOf(out[0]?.item.price ?? 0)) >= 1) ?? scored[1];
    if (alt && n > 1) out.push(alt);
    return out.map(({ item, why, caution, liked }) => ({ item, why, caution, liked }));
  };

  const steps: RoutineStep[] = [];
  steps.push({
    step: "cleanser",
    when: "AM & PM",
    title: "Cleanser",
    tip: q.skinType === "dry" || sensitive ? "In the morning a splash of water is often enough." : "Massage for 30–60 seconds, rinse with lukewarm water.",
    picks: pick("cleanser", (i) => (sensitive ? !i.contains.includes("benzoyl-peroxide") && !i.contains.includes("exfoliant-acid") : true)),
  });

  // morning treatment
  const amTreat = concerns.has("hyperpigmentation") || concerns.has("dullness") || concerns.has("uneven-tone");
  const amFilter = (i: CatalogItem) =>
    !i.contains.includes("retinoid") && (amTreat ? i.goodFor.some((g) => ["hyperpigmentation", "dullness", "uneven-tone"].includes(g)) : i.goodFor.some((g) => concerns.has(g)));
  if (effort !== "minimal" || amTreat) {
    const picks = pick("treatment", amFilter);
    if (picks.length)
      steps.push({ step: "treatment", when: "AM", title: "Morning serum", tip: "Apply to clean skin before moisturizer.", picks });
  }

  steps.push({
    step: "moisturizer",
    when: "AM & PM",
    title: "Moisturizer",
    tip: q.skinType === "oily" ? "Yes, even oily skin needs one — a gel keeps it light." : "Apply while skin is still a little damp.",
    picks: pick("moisturizer"),
  });

  steps.push({
    step: "sunscreen",
    when: "AM",
    title: "Sunscreen",
    tip: "Two finger-lengths for face and neck, every morning — the most effective anti-aging and anti-dark-spot step there is.",
    picks: pick("sunscreen"),
  });

  // night treatment
  const wantsRetinoid = ["fine-lines", "texture", "acne", "hyperpigmentation"].some((c) => concerns.has(c)) && !avoid.has("retinoid");
  if (effort !== "minimal" || wantsRetinoid) {
    const pmFilter = (i: CatalogItem) =>
      wantsRetinoid && !sensitive ? i.contains.includes("retinoid") : !i.contains.includes("vitamin-c") && i.goodFor.some((g) => concerns.has(g));
    const picks = pick("treatment", pmFilter);
    if (picks.length)
      steps.push({
        step: "treatment",
        when: "PM",
        title: wantsRetinoid && !sensitive ? "Night treatment (retinoid)" : "Night treatment",
        tip: wantsRetinoid && !sensitive ? "Start 2–3 nights a week, pea-sized amount, and build up. Always wear SPF." : "Apply after cleansing, before moisturizer.",
        picks,
      });
  }

  if (effort === "full" && (concerns.has("texture") || concerns.has("acne") || concerns.has("dullness")) && !sensitive && !avoid.has("exfoliant-acid")) {
    const picks = pick("exfoliant");
    if (picks.length)
      steps.push({ step: "exfoliant", when: "PM", title: "Exfoliant (2–3× a week)", tip: "Use on nights you skip your retinoid.", picks });
  }

  if (concerns.has("acne")) {
    steps.push({ step: "spot", when: "As needed", title: "Spot treatment", tip: "For individual breakouts — don't pick!", picks: pick("spot") });
  }

  return steps.filter((s) => s.picks.length);
}

export function lookFor(profile: Profile) {
  const out = new Set<string>();
  for (const c of concernSet(profile)) for (const i of LOOK_FOR[c as ConcernKey] ?? []) out.add(i);
  return [...out].slice(0, 10);
}
