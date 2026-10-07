import {
  ACTIVES,
  bestClaim,
  claimsFor,
  LEVEL_LABEL,
  LEVEL_WEIGHT,
  PRACTICE,
  type ActiveId,
  type Claim,
  type EvidenceLevel,
} from "./evidence";
import { familiesToAvoid, personalSignals, type Family } from "./ingredients";
import { normalize } from "./foundations";
import type { ConcernKey, Depth, Profile, SkinType } from "./types";

export type Step = "cleanser" | "treatment" | "exfoliant" | "moisturizer" | "sunscreen" | "spot";

export type CatalogItem = {
  id: string;
  brand: string;
  name: string;
  step: Step;
  /** the ingredients that do the work — these link to published evidence */
  actives: ActiveId[];
  /** approximate US retail price */
  price: number;
  keyIngredients: string[];
  skinTypes: SkinType[];
  /** what the formula is suited to (texture, gentleness) — evidence comes from `actives` */
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
  { id: "cerave-hydrating-cleanser", brand: "CeraVe", name: "Hydrating Facial Cleanser", step: "cleanser", actives: ["gentle-cleanser"], price: 16, keyIngredients: ["ceramides", "hyaluronic acid"], skinTypes: ["dry", "normal"], goodFor: ["dryness", "eczema", "sensitive", "redness"], contains: [], fragranceFree: true },
  { id: "cerave-foaming-cleanser", brand: "CeraVe", name: "Foaming Facial Cleanser", step: "cleanser", actives: ["gentle-cleanser"], price: 16, keyIngredients: ["niacinamide", "ceramides"], skinTypes: ["normal", "combination", "oily"], goodFor: ["oiliness"], contains: [], fragranceFree: true },
  { id: "vanicream-cleanser", brand: "Vanicream", name: "Gentle Facial Cleanser", step: "cleanser", actives: ["gentle-cleanser"], price: 10, keyIngredients: ["no common irritants"], skinTypes: ALL, goodFor: ["sensitive", "rosacea", "eczema", "redness"], contains: [], fragranceFree: true },
  { id: "lrp-toleriane-cleanser", brand: "La Roche-Posay", name: "Toleriane Hydrating Gentle Cleanser", step: "cleanser", actives: ["gentle-cleanser"], price: 17, keyIngredients: ["ceramide-3", "niacinamide", "glycerin"], skinTypes: ["dry", "normal", "combination"], goodFor: ["dryness", "sensitive", "redness"], contains: [], fragranceFree: true },
  { id: "lrp-effaclar-gel", brand: "La Roche-Posay", name: "Effaclar Medicated Gel Cleanser", step: "cleanser", actives: ["salicylic-acid"], price: 17, keyIngredients: ["2% salicylic acid"], skinTypes: ["combination", "oily"], goodFor: ["acne", "oiliness", "texture"], contains: ["exfoliant-acid"] },
  { id: "cerave-acne-cleanser", brand: "CeraVe", name: "Acne Foaming Cream Cleanser", step: "cleanser", actives: ["benzoyl-peroxide"], price: 17, keyIngredients: ["4% benzoyl peroxide", "niacinamide"], skinTypes: ["normal", "combination", "oily"], goodFor: ["acne"], contains: ["benzoyl-peroxide"], fragranceFree: true, note: "Benzoyl peroxide bleaches towels and pillowcases." },
  { id: "dermalogica-ultracalming", brand: "Dermalogica", name: "UltraCalming Cleanser", step: "cleanser", actives: ["gentle-cleanser"], price: 42, keyIngredients: ["soap-free gel-cream texture"], skinTypes: ALL, goodFor: ["sensitive", "redness", "rosacea"], contains: [] },

  // Treatments / serums
  { id: "to-niacinamide", brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", step: "treatment", actives: ["niacinamide"], price: 6, keyIngredients: ["niacinamide", "zinc PCA"], skinTypes: ["normal", "combination", "oily"], goodFor: ["oiliness", "acne", "uneven-tone", "hyperpigmentation"], contains: [], note: "Clinical studies used 2–5% niacinamide; 10% isn't proven better and irritates some people." },
  { id: "to-azelaic", brand: "The Ordinary", name: "Azelaic Acid Suspension 10%", step: "treatment", actives: ["azelaic-acid"], price: 12, keyIngredients: ["azelaic acid"], skinTypes: ALL, goodFor: ["redness", "rosacea", "acne", "hyperpigmentation", "uneven-tone"], contains: [], note: "10% strength — the best-studied versions are prescription 15–20%. Can tingle for the first week or two." },
  { id: "to-ha", brand: "The Ordinary", name: "Hyaluronic Acid 2% + B5", step: "treatment", actives: ["hyaluronic-acid", "panthenol"], price: 9, keyIngredients: ["hyaluronic acid", "panthenol"], skinTypes: ALL, goodFor: ["dryness", "fine-lines", "dullness"], contains: [], note: "Apply to damp skin and seal with moisturizer." },
  { id: "good-molecules-discoloration", brand: "Good Molecules", name: "Discoloration Correcting Serum", step: "treatment", actives: ["tranexamic-acid", "niacinamide"], price: 12, keyIngredients: ["tranexamic acid", "niacinamide"], skinTypes: ALL, goodFor: ["hyperpigmentation", "uneven-tone", "dullness"], contains: [] },
  { id: "timeless-vitc", brand: "Timeless", name: "20% Vitamin C + E Ferulic Acid Serum", step: "treatment", actives: ["vitamin-c"], price: 30, keyIngredients: ["L-ascorbic acid", "vitamin E", "ferulic acid"], skinTypes: ["normal", "combination", "oily"], goodFor: ["dullness", "hyperpigmentation", "fine-lines", "uneven-tone"], contains: ["vitamin-c"], note: "Use in the morning under sunscreen. Store away from light." },
  { id: "skinceuticals-cef", brand: "SkinCeuticals", name: "C E Ferulic", step: "treatment", actives: ["vitamin-c"], price: 185, keyIngredients: ["15% L-ascorbic acid", "vitamin E", "ferulic acid"], skinTypes: ["normal", "combination", "dry"], goodFor: ["dullness", "hyperpigmentation", "fine-lines"], contains: ["vitamin-c"] },
  { id: "skin1004-centella", brand: "SKIN1004", name: "Madagascar Centella Ampoule", step: "treatment", actives: ["centella"], price: 20, keyIngredients: ["centella asiatica"], skinTypes: ALL, goodFor: ["redness", "sensitive", "rosacea"], contains: [] },
  { id: "differin", brand: "Differin", name: "Adapalene Gel 0.1%", step: "treatment", actives: ["adapalene"], price: 15, keyIngredients: ["adapalene (retinoid)"], skinTypes: ["normal", "combination", "oily"], goodFor: ["acne", "texture"], contains: ["retinoid"], fragranceFree: true, note: "Nighttime only. Start 2–3 nights a week." },
  { id: "cerave-retinol", brand: "CeraVe", name: "Resurfacing Retinol Serum", step: "treatment", actives: ["retinol", "niacinamide"], price: 20, keyIngredients: ["encapsulated retinol", "niacinamide", "licorice root"], skinTypes: ALL, goodFor: ["texture", "hyperpigmentation", "fine-lines", "acne"], contains: ["retinoid"], fragranceFree: true, note: "Nighttime only. Start slowly." },
  { id: "pc-retinol", brand: "Paula's Choice", name: "1% Retinol Treatment", step: "treatment", actives: ["retinol", "peptides"], price: 65, keyIngredients: ["1% retinol", "peptides", "vitamin C"], skinTypes: ["normal", "combination", "oily"], goodFor: ["fine-lines", "texture", "uneven-tone"], contains: ["retinoid"], fragranceFree: true, note: "A strong retinol — not a first retinoid for sensitive skin." },

  // Exfoliants
  { id: "pc-bha", brand: "Paula's Choice", name: "Skin Perfecting 2% BHA Liquid Exfoliant", step: "exfoliant", actives: ["salicylic-acid"], price: 35, keyIngredients: ["2% salicylic acid"], skinTypes: ["normal", "combination", "oily"], goodFor: ["acne", "oiliness", "texture"], contains: ["exfoliant-acid"], fragranceFree: true },
  { id: "to-glycolic", brand: "The Ordinary", name: "Glycolic Acid 7% Exfoliating Toner", step: "exfoliant", actives: ["aha"], price: 13, keyIngredients: ["glycolic acid"], skinTypes: ["normal", "combination", "oily"], goodFor: ["texture", "dullness", "uneven-tone"], contains: ["exfoliant-acid"] },

  // Moisturizers
  { id: "cerave-cream", brand: "CeraVe", name: "Moisturizing Cream", step: "moisturizer", actives: ["moisturizer"], price: 19, keyIngredients: ["ceramides", "hyaluronic acid", "petrolatum"], skinTypes: ["dry", "normal"], goodFor: ["dryness", "eczema", "sensitive"], contains: [], fragranceFree: true },
  { id: "cerave-pm", brand: "CeraVe", name: "PM Facial Moisturizing Lotion", step: "moisturizer", actives: ["moisturizer"], price: 17, keyIngredients: ["niacinamide", "ceramides"], skinTypes: ALL, goodFor: ["redness", "sensitive"], contains: [], fragranceFree: true, note: "Contains niacinamide at an undisclosed strength." },
  { id: "vanicream-cream", brand: "Vanicream", name: "Moisturizing Cream", step: "moisturizer", actives: ["moisturizer"], price: 15, keyIngredients: ["no common irritants"], skinTypes: ["dry", "normal"], goodFor: ["dryness", "eczema", "sensitive", "rosacea"], contains: [], fragranceFree: true },
  { id: "lrp-double-repair", brand: "La Roche-Posay", name: "Toleriane Double Repair Face Moisturizer", step: "moisturizer", actives: ["moisturizer"], price: 24, keyIngredients: ["ceramide-3", "niacinamide", "glycerin"], skinTypes: ALL, goodFor: ["sensitive", "redness", "dryness"], contains: [], fragranceFree: true },
  { id: "clinique-ddmg", brand: "Clinique", name: "Dramatically Different Moisturizing Gel", step: "moisturizer", actives: ["moisturizer"], price: 32, keyIngredients: ["lightweight humectants"], skinTypes: ["combination", "oily"], goodFor: ["oiliness"], contains: [], fragranceFree: true },
  { id: "neutrogena-hydro-boost", brand: "Neutrogena", name: "Hydro Boost Water Gel", step: "moisturizer", actives: ["moisturizer", "hyaluronic-acid"], price: 22, keyIngredients: ["hyaluronic acid"], skinTypes: ["normal", "combination", "oily"], goodFor: ["oiliness", "dullness"], contains: ["fragrance"], note: "The original version contains fragrance." },
  { id: "lrp-cicaplast", brand: "La Roche-Posay", name: "Cicaplast Baume B5", step: "moisturizer", actives: ["moisturizer", "panthenol", "centella"], price: 17, keyIngredients: ["panthenol", "madecassoside", "shea butter"], skinTypes: ["dry", "normal"], goodFor: ["dryness", "eczema", "redness", "sensitive"], contains: [], fragranceFree: true, note: "Rich — great as a night cream or on dry patches." },
  { id: "fab-ultra-repair", brand: "First Aid Beauty", name: "Ultra Repair Cream", step: "moisturizer", actives: ["moisturizer", "colloidal-oatmeal"], price: 40, keyIngredients: ["colloidal oatmeal", "shea butter"], skinTypes: ["dry", "normal"], goodFor: ["dryness", "eczema"], contains: ["essential-oil"], note: "Contains eucalyptus oil." },
  { id: "de-protini", brand: "Drunk Elephant", name: "Protini Polypeptide Cream", step: "moisturizer", actives: ["moisturizer", "peptides"], price: 68, keyIngredients: ["signal peptides", "amino acids"], skinTypes: ["normal", "combination", "dry"], goodFor: ["fine-lines"], contains: [], fragranceFree: true, note: "Peptide evidence is limited — this is mainly a good moisturizer." },
  { id: "tatcha-water-cream", brand: "Tatcha", name: "The Water Cream", step: "moisturizer", actives: ["moisturizer"], price: 72, keyIngredients: ["Japanese botanicals", "lightweight gel"], skinTypes: ["combination", "oily"], goodFor: ["oiliness"], contains: ["fragrance"] },

  // Sunscreens
  { id: "eltamd-uv-clear", brand: "EltaMD", name: "UV Clear Broad-Spectrum SPF 46", step: "sunscreen", actives: ["sunscreen", "mineral-filter"], price: 41, keyIngredients: ["zinc oxide", "niacinamide"], skinTypes: ALL, goodFor: ["redness", "rosacea", "sensitive"], contains: [], fragranceFree: true, note: "Zinc oxide plus octinoxate; sheer on most skin tones." },
  { id: "lrp-anthelios-milk", brand: "La Roche-Posay", name: "Anthelios Melt-in Milk SPF 60", step: "sunscreen", actives: ["sunscreen"], price: 37, keyIngredients: ["broad-spectrum chemical filters"], skinTypes: ["dry", "normal"], goodFor: ["dryness"], contains: ["chemical-filter"] },
  { id: "cerave-am-spf", brand: "CeraVe", name: "AM Facial Moisturizing Lotion SPF 30", step: "sunscreen", actives: ["sunscreen", "moisturizer"], price: 17, keyIngredients: ["ceramides", "niacinamide"], skinTypes: ALL, goodFor: ["dryness", "sensitive"], contains: [], fragranceFree: true, note: "Moisturizer + SPF in one — handy for a minimal routine." },
  { id: "supergoop-unseen", brand: "Supergoop!", name: "Unseen Sunscreen SPF 40", step: "sunscreen", actives: ["sunscreen"], price: 38, keyIngredients: ["invisible gel", "chemical filters"], skinTypes: ["normal", "combination", "oily"], goodFor: ["oiliness"], contains: ["chemical-filter"], note: "Doubles as a smoothing makeup primer." },
  { id: "black-girl-sunscreen", brand: "Black Girl Sunscreen", name: "SPF 30", step: "sunscreen", actives: ["sunscreen"], price: 16, keyIngredients: ["chemical filters", "avocado", "jojoba"], skinTypes: ["dry", "normal", "combination"], goodFor: ["dryness"], contains: ["chemical-filter"], note: "No white cast on deeper skin." },
  { id: "boj-relief-sun", brand: "Beauty of Joseon", name: "Relief Sun: Rice + Probiotics SPF 50+", step: "sunscreen", actives: ["sunscreen"], price: 18, keyIngredients: ["rice extract", "modern UV filters"], skinTypes: ["dry", "normal", "combination"], goodFor: ["dryness", "dullness"], contains: [], note: "Lightweight, no white cast." },
  { id: "vanicream-spf", brand: "Vanicream", name: "Facial Moisturizer SPF 30", step: "sunscreen", actives: ["sunscreen", "mineral-filter"], price: 15, keyIngredients: ["zinc oxide"], skinTypes: ALL, goodFor: ["sensitive", "rosacea", "eczema"], contains: [], fragranceFree: true, mineral: true },

  // Spot treatments
  { id: "hero-mighty-patch", brand: "Hero Cosmetics", name: "Mighty Patch Original", step: "spot", actives: ["hydrocolloid"], price: 13, keyIngredients: ["hydrocolloid"], skinTypes: ALL, goodFor: ["acne"], contains: [] },
  { id: "lrp-effaclar-duo", brand: "La Roche-Posay", name: "Effaclar Duo Acne Spot Treatment", step: "spot", actives: ["benzoyl-peroxide"], price: 30, keyIngredients: ["benzoyl peroxide"], skinTypes: ["normal", "combination", "oily"], goodFor: ["acne"], contains: ["benzoyl-peroxide"] },
];

export const STEP_LABEL: Record<Step, string> = {
  cleanser: "Cleanse",
  treatment: "Treat",
  exfoliant: "Exfoliate",
  moisturizer: "Moisturize",
  sunscreen: "Protect (SPF)",
  spot: "Spot treat",
};

export type Pick = {
  item: CatalogItem;
  why: string[];
  /** published evidence that this product's actives help your concerns, strongest first */
  evidence: Claim[];
  caution?: string;
  liked: boolean;
};
export type Note = { level: EvidenceLevel; text: string; sources: string[] };
export type RoutineStep = {
  step: Step;
  when: "AM" | "PM" | "AM & PM" | "As needed";
  title: string;
  tip: string;
  note?: Note;
  picks: Pick[];
};

const tierOf = (price: number) => (price < 20 ? 1 : price < 40 ? 2 : price < 60 ? 3 : 4);
const label = (c: string) => (c === "sensitive" ? "sensitive skin" : c.replace("-", " "));

function scoreItem(item: CatalogItem, profile: Profile, avoid: Set<Family>, depth: Depth | undefined, concerns: Set<string>) {
  const q = profile.quiz;
  const why: string[] = [];
  const evidence: Claim[] = [];
  let caution: string | undefined;
  let s = 0;
  if (q.skinType && item.skinTypes.includes(q.skinType)) {
    s += 2;
    why.push(`suits ${q.skinType} skin`);
  } else if (q.skinType) s -= 3;

  // Evidence first: how well-proven are this product's actives for *your* concerns?
  const formulatedFor: string[] = [];
  for (const concern of concerns) {
    const claim = bestClaim(item.actives, concern);
    if (claim) {
      s += LEVEL_WEIGHT[claim.level];
      evidence.push(claim);
    } else if (item.goodFor.includes(concern as CatalogItem["goodFor"][number])) {
      // suited by formulation (gentle, rich, light) but no active with evidence for it
      s += 0.5;
      formulatedFor.push(label(concern));
    }
  }
  evidence.sort((a, b) => LEVEL_WEIGHT[b.level] - LEVEL_WEIGHT[a.level]);
  for (const c of evidence.slice(0, 2))
    why.push(`${ACTIVES[c.active].name.split(" (")[0]} for ${label(c.concern)} — ${LEVEL_LABEL[c.level].toLowerCase()}`);
  if (formulatedFor.length) why.push(`formulated for ${formulatedFor.slice(0, 2).join(" and ")}`);

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
  return { s, why, evidence, caution };
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
  const reactive = q.sensitivity === "very" || concerns.has("rosacea") || concerns.has("eczema");

  const pick = (step: Step, filter: (i: CatalogItem) => boolean = () => true, n = 2): Pick[] => {
    const scored = CATALOG.filter((i) => i.step === step && filter(i) && !isLogged(profile, i, "disliked"))
      .map((item) => {
        const r = scoreItem(item, profile, avoid, depth, concerns);
        if (!r) return null;
        const liked = isLogged(profile, item, "liked");
        return { item, s: r.s + (liked ? 5 : 0), why: r.why, evidence: r.evidence, caution: r.caution, liked };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.s - a.s);
    const out = scored.slice(0, 1);
    // second pick: a different price point for choice
    const alt = scored.slice(1).find((x) => Math.abs(tierOf(x.item.price) - tierOf(out[0]?.item.price ?? 0)) >= 1) ?? scored[1];
    if (alt && n > 1) out.push(alt);
    return out.map(({ item, why, evidence, caution, liked }) => ({ item, why, evidence, caution, liked }));
  };
  /** does any active in this product have evidence for one of these concerns? */
  const provenFor = (i: CatalogItem, list: Iterable<string>) => [...list].some((c) => bestClaim(i.actives, c));

  const steps: RoutineStep[] = [];
  steps.push({
    step: "cleanser",
    when: "AM & PM",
    title: "Cleanser",
    tip: reactive
      ? "Use a gentle non-soap cleanser with lukewarm water; in the morning, water alone is often enough."
      : "Massage for 30–60 seconds and rinse with lukewarm water.",
    picks: pick("cleanser", (i) => (reactive ? !i.contains.includes("benzoyl-peroxide") && !i.contains.includes("exfoliant-acid") : true)),
  });

  // Morning: pigment and antioxidant actives (they pair with sunscreen); no retinoids or acids
  const pigment = ["hyperpigmentation", "dullness", "uneven-tone"].filter((c) => concerns.has(c));
  const amFilter = (i: CatalogItem) =>
    !i.contains.includes("retinoid") && !i.actives.includes("aha") && provenFor(i, pigment.length ? pigment : concerns);
  if (effort !== "minimal" || pigment.length) {
    const picks = pick("treatment", amFilter);
    if (picks.length)
      steps.push({ step: "treatment", when: "AM", title: "Morning serum", tip: "Apply to clean skin before moisturizer.", picks });
  }

  steps.push({
    step: "moisturizer",
    when: "AM & PM",
    title: "Moisturizer",
    tip:
      q.skinType === "oily"
        ? "A light gel is enough — it also offsets the dryness from acne and retinoid treatments."
        : "Apply while skin is still slightly damp to lock in water.",
    note: concerns.has("eczema") || concerns.has("dryness") ? { ...claimNote("moisturizer", concerns.has("eczema") ? "eczema" : "dryness") } : undefined,
    picks: pick("moisturizer"),
  });

  steps.push({
    step: "sunscreen",
    when: "AM",
    title: "Sunscreen",
    tip: "Every morning, face and neck — the step with the strongest anti-aging evidence of all.",
    note: PRACTICE.sunscreenAmount,
    picks: pick("sunscreen"),
  });

  // Night: a retinoid when the evidence supports one for your concerns
  const retinoidConcerns = ["fine-lines", "acne", "texture", "hyperpigmentation"].filter((c) => concerns.has(c));
  const wantsRetinoid = retinoidConcerns.length > 0 && !avoid.has("retinoid") && !concerns.has("rosacea") && !concerns.has("eczema");
  if (effort !== "minimal" || wantsRetinoid) {
    const pmFilter = (i: CatalogItem) =>
      wantsRetinoid
        ? i.contains.includes("retinoid") && provenFor(i, retinoidConcerns)
        : !i.contains.includes("vitamin-c") && provenFor(i, concerns);
    const picks = pick("treatment", pmFilter);
    if (picks.length)
      steps.push({
        step: "treatment",
        when: "PM",
        title: wantsRetinoid ? "Night treatment (retinoid)" : "Night treatment",
        tip: wantsRetinoid ? "Pea-sized amount for the whole face, on dry skin." : "Apply after cleansing, before moisturizer.",
        note: wantsRetinoid ? PRACTICE.retinoidRamp : undefined,
        picks,
      });
  }

  if (
    effort === "full" &&
    ["texture", "acne", "dullness"].some((c) => concerns.has(c)) &&
    !reactive &&
    !avoid.has("exfoliant-acid")
  ) {
    const picks = pick("exfoliant");
    if (picks.length)
      steps.push({
        step: "exfoliant",
        when: "PM",
        title: "Exfoliant (2–3× a week)",
        tip: "Use on nights you skip your retinoid.",
        note: PRACTICE.ahaSun,
        picks,
      });
  }

  if (concerns.has("acne")) {
    steps.push({ step: "spot", when: "As needed", title: "Spot treatment", tip: "For individual breakouts — and hands off.", picks: pick("spot") });
  }

  return steps.filter((s) => s.picks.length);
}

function claimNote(active: ActiveId, concern: string): Note {
  const c = bestClaim([active], concern)!;
  return { level: c.level, text: c.summary, sources: c.sources };
}

export type ActiveAdvice = { active: ActiveId; name: string; how: string; rxOnly?: boolean; level: EvidenceLevel; claims: Claim[] };

/** The ingredients worth looking for, ranked by how strong the evidence is for your concerns. */
export function lookFor(profile: Profile): ActiveAdvice[] {
  const avoid = familiesToAvoid(profile, personalSignals(profile));
  const byActive = new Map<ActiveId, Claim[]>();
  for (const c of claimsFor(concernSet(profile))) {
    if (c.active === "tretinoin" || c.active === "adapalene" || c.active === "retinol") {
      if (avoid.has("retinoid")) continue;
    }
    byActive.set(c.active, [...(byActive.get(c.active) ?? []), c]);
  }
  return [...byActive.entries()]
    .map(([active, claims]) => ({ active, ...ACTIVES[active], level: claims[0].level, claims }))
    .sort((a, b) => LEVEL_WEIGHT[b.level] - LEVEL_WEIGHT[a.level] || b.claims.length - a.claims.length);
}
