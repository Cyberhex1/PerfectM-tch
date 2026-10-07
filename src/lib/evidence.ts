/**
 * The science behind every skincare recommendation and ingredient warning.
 *
 * Each claim carries an evidence grade and the published sources it rests on.
 * Every source below was checked against its PubMed record (title, authors,
 * journal, year, PMID); links go straight to PubMed. Recommendations are ranked by
 * evidence strength, so a guideline-backed active beats a promising lab finding.
 */
import type { ConcernKey } from "./types";

export type EvidenceLevel = "strong" | "moderate" | "limited" | "expert";

export const LEVEL_LABEL: Record<EvidenceLevel, string> = {
  strong: "Strong evidence",
  moderate: "Moderate evidence",
  limited: "Limited evidence",
  expert: "Expert consensus",
};

export const LEVEL_DEFINITION: Record<EvidenceLevel, string> = {
  strong: "Strongly recommended by a systematic, GRADE-based clinical guideline, or shown in large randomized controlled trials.",
  moderate: "Supported by randomized controlled trials or meta-analyses, or a conditional recommendation in a clinical guideline.",
  limited: "Small, short or uncontrolled studies, lab data, or mechanism only. Plausible, but not well proven.",
  expert: "Standard dermatology practice endorsed by expert bodies, without direct trial evidence for this specific use.",
};

/** How much evidence counts toward ranking a product. */
export const LEVEL_WEIGHT: Record<EvidenceLevel, number> = { strong: 3, moderate: 2, limited: 1, expert: 0.75 };

export type SourceType = "guideline" | "meta-analysis" | "rct" | "review" | "study" | "regulation";

export type Source = {
  id: string;
  authors: string;
  title: string;
  journal: string;
  year: number;
  type: SourceType;
  pmid?: string;
  url: string;
};

const pubmed = (pmid: string) => `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
const src = (id: string, authors: string, title: string, journal: string, year: number, type: SourceType, pmid: string): Source => ({
  id,
  authors,
  title,
  journal,
  year,
  type,
  pmid,
  url: pubmed(pmid),
});

export const SOURCES: Record<string, Source> = Object.fromEntries(
  [
    // Clinical guidelines
    src("aad-acne-2024", "Reynolds RV, et al.", "Guidelines of care for the management of acne vulgaris", "J Am Acad Dermatol", 2024, "guideline", "38300170"),
    src("aad-ad-2023", "Sidbury R, et al.", "Guidelines of care for the management of atopic dermatitis in adults with topical therapies", "J Am Acad Dermatol", 2023, "guideline", "36641009"),
    src("nrs-2019", "Thiboutot D, et al.", "Standard management options for rosacea: the 2019 update by the National Rosacea Society Expert Committee", "J Am Acad Dermatol", 2020, "guideline", "32035944"),
    src("mcmullan-2024", "McMullan P, et al.", "Safety of dermatologic medications in pregnancy and lactation: an update — Part I: Pregnancy", "J Am Acad Dermatol", 2024, "review", "38280679"),
    // Sun protection
    src("hughes-2013", "Hughes MC, et al.", "Sunscreen and prevention of skin aging: a randomized trial", "Ann Intern Med", 2013, "rct", "23732711"),
    src("petersen-2014", "Petersen B, Wulf HC", "Application of sunscreen — theory and reality", "Photodermatol Photoimmunol Photomed", 2014, "review", "24313722"),
    src("fatima-2020", "Fatima S, et al.", "The role of sunscreen in melasma and postinflammatory hyperpigmentation", "Indian J Dermatol", 2020, "review", "32029932"),
    // Actives
    src("weiss-1988", "Weiss JS, et al.", "Topical tretinoin improves photoaged skin: a double-blind vehicle-controlled study", "JAMA", 1988, "rct", "3336176"),
    src("kafi-2007", "Kafi R, et al.", "Improvement of naturally aged skin with vitamin A (retinol)", "Arch Dermatol", 2007, "rct", "17515510"),
    src("bissett-2005", "Bissett DL, et al.", "Niacinamide: a B vitamin that improves aging facial skin appearance", "Dermatol Surg", 2005, "rct", "16029679"),
    src("hakozaki-2002", "Hakozaki T, et al.", "The effect of niacinamide on reducing cutaneous pigmentation and suppression of melanosome transfer", "Br J Dermatol", 2002, "rct", "12100180"),
    src("draelos-2006-sebum", "Draelos ZD, et al.", "The effect of 2% niacinamide on facial sebum production", "J Cosmet Laser Ther", 2006, "study", "16766489"),
    src("shalita-1995", "Shalita AR, et al.", "Topical nicotinamide compared with clindamycin gel in the treatment of inflammatory acne vulgaris", "Int J Dermatol", 1995, "rct", "7657446"),
    src("schulte-2015", "Schulte BC, et al.", "Azelaic acid: evidence-based update on mechanism of action and clinical application", "J Drugs Dermatol", 2015, "review", "26355614"),
    src("albzea-2023", "Albzea W, et al.", "Azelaic acid versus hydroquinone for managing patients with melasma: systematic review and meta-analysis of randomized controlled trials", "Cureus", 2023, "meta-analysis", "37457606"),
    src("telang-2013", "Telang PS", "Vitamin C in dermatology", "Indian Dermatol Online J", 2013, "review", "23741676"),
    src("lin-2005", "Lin FH, et al.", "Ferulic acid stabilizes a solution of vitamins C and E and doubles its photoprotection of skin", "J Invest Dermatol", 2005, "study", "16185284"),
    src("taraz-2017", "Taraz M, et al.", "Tranexamic acid in treatment of melasma: a comprehensive review of clinical studies", "Dermatol Ther", 2017, "review", "28133910"),
    src("kornhauser-2010", "Kornhauser A, et al.", "Applications of hydroxy acids: classification, mechanisms, and photoactivity", "Clin Cosmet Investig Dermatol", 2010, "review", "21437068"),
    src("kornhauser-2009", "Kornhauser A, et al.", "The effects of topically applied glycolic acid and salicylic acid on ultraviolet radiation-induced erythema, DNA damage and sunburn cell formation in human skin", "J Dermatol Sci", 2009, "study", "19411163"),
    src("pavicic-2011", "Pavicic T, et al.", "Efficacy of cream-based novel formulations of hyaluronic acid of different molecular weights in anti-wrinkle treatment", "J Drugs Dermatol", 2011, "study", "22052267"),
    src("proksch-2017", "Proksch E, et al.", "Topical use of dexpanthenol: a 70th anniversary article", "J Dermatolog Treat", 2017, "review", "28503966"),
    src("reynertson-2015", "Reynertson KA, et al.", "Anti-inflammatory activities of colloidal oatmeal (Avena sativa) contribute to the effectiveness of oats in treatment of itch associated with dry, irritated skin", "J Drugs Dermatol", 2015, "study", "25607907"),
    src("bylka-2013", "Bylka W, et al.", "Centella asiatica in cosmetology", "Postepy Dermatol Alergol", 2013, "review", "24278045"),
    src("gorouhi-2009", "Gorouhi F, Maibach HI", "Role of topical peptides in preventing or treating aged skin", "Int J Cosmet Sci", 2009, "review", "19570099"),
    src("chao-2006", "Chao CM, et al.", "A pilot study on efficacy treatment of acne vulgaris using a new method: results of a randomized double-blind trial with Acne Dressing", "J Cosmet Sci", 2006, "rct", "16688374"),
    src("vrcek-2016", "Vrcek I, et al.", "Infraorbital dark circles: a review of the pathogenesis, evaluation and treatment", "J Cutan Aesthet Surg", 2016, "review", "27398005"),
    src("draelos-2018-cleansers", "Draelos ZD", "The science behind skin care: Cleansers", "J Cosmet Dermatol", 2018, "review", "29231284"),
    // Irritants & allergens
    src("degroot-2020", "de Groot AC", "Fragrances: contact allergy and other adverse effects", "Dermatitis", 2020, "review", "31433384"),
    src("dekoven-2023", "DeKoven JG, et al.", "North American Contact Dermatitis Group patch test results: 2019–2020", "Dermatitis", 2023, "study", "36917520"),
    src("bennike-2019", "Bennike NH, et al.", "Allergic contact dermatitis caused by hydroperoxides of limonene and dose-response relationships", "Contact Dermatitis", 2019, "study", "30378136"),
    src("degroot-eo-2016", "de Groot AC, Schmidt E", "Essential oils, part IV: contact allergy", "Dermatitis", 2016, "review", "27427818"),
    src("castanedo-2013", "Castanedo-Tardana MP, Zug KA", "Methylisothiazolinone", "Dermatitis", 2013, "review", "23340392"),
    src("degroot-fr-2010", "de Groot AC, et al.", "Formaldehyde-releasers in cosmetics: relationship to formaldehyde contact allergy. Part 1", "Contact Dermatitis", 2010, "review", "20136875"),
    src("lee-1995", "Lee CH, Maibach HI", "The sodium lauryl sulfate model: an overview", "Contact Dermatitis", 1995, "review", "7493454"),
    src("charbonnier-2001", "Charbonnier V, et al.", "Subclinical, non-erythematous irritation with an open assay model (washing): sodium lauryl sulfate (SLS) versus sodium laureth sulfate (SLES)", "Food Chem Toxicol", 2001, "study", "11278060"),
    src("lachenmeier-2008", "Lachenmeier DW", "Safety evaluation of topical applications of ethanol on the skin and inside the oral cavity", "J Occup Med Toxicol", 2008, "review", "19014531"),
    src("draelos-2006-comedo", "Draelos ZD, DiNardo JC", "A re-evaluation of the comedogenicity concept", "J Am Acad Dermatol", 2006, "study", "16488305"),
    src("heurung-2014", "Heurung AR, et al.", "Benzophenones", "Dermatitis", 2014, "review", "24407064"),
    src("degroot-octo-2014", "de Groot AC, Roberts DW", "Contact and photocontact allergy to octocrylene: a review", "Contact Dermatitis", 2014, "review", "24628344"),
    src("jenkins-2023", "Jenkins BA, Belsito DV", "Lanolin", "Dermatitis", 2023, "review", "36917502"),
    src("jacob-2018", "Jacob SE, et al.", "Propylene glycol", "Dermatitis", 2018, "review", "29059092"),
    src("nakada-2000", "Nakada T, et al.", "Use tests: ROAT (repeated open application test)/PUT (provocative use test): an overview", "Contact Dermatitis", 2000, "review", "10902580"),
  ].map((s) => [s.id, s]),
);

// ---------- actives and what they're proven to do ----------

export type ActiveId =
  | "benzoyl-peroxide"
  | "adapalene"
  | "tretinoin"
  | "retinol"
  | "salicylic-acid"
  | "azelaic-acid"
  | "niacinamide"
  | "vitamin-c"
  | "tranexamic-acid"
  | "aha"
  | "sunscreen"
  | "mineral-filter"
  | "moisturizer"
  | "gentle-cleanser"
  | "hyaluronic-acid"
  | "panthenol"
  | "colloidal-oatmeal"
  | "centella"
  | "peptides"
  | "hydrocolloid"
  | "caffeine";

export const ACTIVES: Record<ActiveId, { name: string; how: string; rxOnly?: boolean }> = {
  "benzoyl-peroxide": { name: "Benzoyl peroxide", how: "Kills acne bacteria (C. acnes) without breeding antibiotic resistance." },
  adapalene: { name: "Adapalene (retinoid)", how: "Normalises how pores shed cells so they don't clog. 0.1% is sold over the counter in the US." },
  tretinoin: { name: "Tretinoin (prescription retinoid)", how: "The most-studied topical retinoid for both acne and photoaging.", rxOnly: true },
  retinol: { name: "Retinol", how: "Converted in skin to retinoic acid — gentler and weaker than prescription retinoids." },
  "salicylic-acid": { name: "Salicylic acid (BHA)", how: "Oil-soluble exfoliant that works inside pores." },
  "azelaic-acid": { name: "Azelaic acid", how: "Calms inflammation, reduces acne bacteria and slows pigment production." },
  niacinamide: { name: "Niacinamide (vitamin B3)", how: "Reduces pigment transfer to skin cells and supports the skin barrier." },
  "vitamin-c": { name: "Vitamin C (L-ascorbic acid)", how: "Antioxidant that adds to sunscreen's protection and can fade pigment." },
  "tranexamic-acid": { name: "Tranexamic acid", how: "Interrupts a pigment-signalling pathway involved in melasma." },
  aha: { name: "AHAs (glycolic, lactic acid)", how: "Loosen dead surface cells for smoother, brighter skin — and raise sun sensitivity." },
  sunscreen: { name: "Daily broad-spectrum sunscreen", how: "Blocks the UV radiation behind most visible aging and dark spots." },
  "mineral-filter": { name: "Mineral filters (zinc oxide, titanium dioxide)", how: "UV filters that very rarely cause allergic reactions." },
  moisturizer: { name: "Barrier moisturizer", how: "Humectants, emollients and occlusives (glycerin, ceramides, petrolatum) hold water in and support the barrier." },
  "gentle-cleanser": { name: "Gentle non-soap cleanser", how: "Synthetic-detergent cleansers disturb the skin barrier less than traditional soap." },
  "hyaluronic-acid": { name: "Hyaluronic acid", how: "Humectant that draws water into the outer layer of skin." },
  panthenol: { name: "Panthenol (provitamin B5)", how: "Humectant that supports barrier repair." },
  "colloidal-oatmeal": { name: "Colloidal oatmeal", how: "Soothing skin protectant with anti-itch, anti-inflammatory compounds." },
  centella: { name: "Centella asiatica", how: "Plant extract with anti-inflammatory compounds (madecassoside, asiaticoside)." },
  peptides: { name: "Peptides", how: "Proposed to signal collagen production." },
  hydrocolloid: { name: "Hydrocolloid patches", how: "Absorb fluid from a spot and stop you picking at it." },
  caffeine: { name: "Caffeine", how: "Constricts blood vessels; may reduce puffiness." },
};

export type Claim = {
  active: ActiveId;
  concern: ConcernKey | "sensitive";
  level: EvidenceLevel;
  summary: string;
  sources: string[];
};

export const CLAIMS: Claim[] = [
  // Acne
  { active: "benzoyl-peroxide", concern: "acne", level: "strong", summary: "Strongly recommended in the American Academy of Dermatology's 2024 acne guideline.", sources: ["aad-acne-2024"] },
  { active: "adapalene", concern: "acne", level: "strong", summary: "Topical retinoids are strongly recommended in the AAD's 2024 acne guideline; adapalene 0.1% needs no prescription.", sources: ["aad-acne-2024"] },
  { active: "tretinoin", concern: "acne", level: "strong", summary: "Topical retinoids are strongly recommended in the AAD's 2024 acne guideline. Ask a dermatologist.", sources: ["aad-acne-2024"] },
  { active: "azelaic-acid", concern: "acne", level: "moderate", summary: "Conditionally recommended in the AAD's 2024 acne guideline.", sources: ["aad-acne-2024", "schulte-2015"] },
  { active: "salicylic-acid", concern: "acne", level: "limited", summary: "Only conditionally recommended in the AAD's 2024 guideline — the trial evidence is thinner than for benzoyl peroxide or retinoids.", sources: ["aad-acne-2024"] },
  { active: "niacinamide", concern: "acne", level: "limited", summary: "One 8-week randomized trial found 4% niacinamide gel comparable to 1% clindamycin gel for inflammatory acne.", sources: ["shalita-1995"] },
  { active: "hydrocolloid", concern: "acne", level: "limited", summary: "A small randomized pilot trial found hydrocolloid dressings improved individual spots.", sources: ["chao-2006"] },
  { active: "retinol", concern: "acne", level: "limited", summary: "Retinol is a weaker relative of the retinoids recommended for acne; it hasn't been tested as thoroughly.", sources: ["aad-acne-2024"] },

  // Oiliness
  { active: "niacinamide", concern: "oiliness", level: "limited", summary: "A small study found 2% niacinamide lowered sebum production over 2–4 weeks.", sources: ["draelos-2006-sebum"] },
  { active: "salicylic-acid", concern: "oiliness", level: "limited", summary: "Being oil-soluble, it reaches into pores; evidence for lasting oil reduction is limited.", sources: ["kornhauser-2010"] },

  // Rosacea & redness
  { active: "azelaic-acid", concern: "rosacea", level: "strong", summary: "Azelaic acid (15% gel, prescription) is an established first-line rosacea treatment. Over-the-counter versions are 10% and less studied.", sources: ["nrs-2019", "schulte-2015"] },
  { active: "azelaic-acid", concern: "redness", level: "moderate", summary: "Reduces inflammatory redness and bumps in rosacea trials; 10% OTC versions are weaker than the prescription 15%.", sources: ["nrs-2019"] },
  { active: "sunscreen", concern: "rosacea", level: "expert", summary: "Daily sun protection and gentle skincare are standard parts of rosacea care.", sources: ["nrs-2019"] },
  { active: "moisturizer", concern: "rosacea", level: "expert", summary: "Gentle cleansing and moisturising are recommended alongside rosacea treatments.", sources: ["nrs-2019"] },
  { active: "niacinamide", concern: "redness", level: "limited", summary: "Reduced red blotchiness in a 12-week split-face trial of 5% niacinamide.", sources: ["bissett-2005"] },
  { active: "centella", concern: "redness", level: "limited", summary: "Anti-inflammatory in lab studies; human trials are small.", sources: ["bylka-2013"] },
  { active: "centella", concern: "sensitive", level: "limited", summary: "Anti-inflammatory in lab studies; human trials are small.", sources: ["bylka-2013"] },
  { active: "mineral-filter", concern: "sensitive", level: "expert", summary: "Some chemical UV filters (benzophenones, octocrylene) are recognised allergens; mineral filters very rarely are.", sources: ["heurung-2014", "degroot-octo-2014"] },
  { active: "mineral-filter", concern: "rosacea", level: "expert", summary: "Mineral sunscreens are usually best tolerated on reactive skin.", sources: ["nrs-2019", "heurung-2014"] },
  { active: "gentle-cleanser", concern: "sensitive", level: "expert", summary: "Non-soap (syndet) cleansers disturb the skin barrier less than soap.", sources: ["draelos-2018-cleansers"] },
  { active: "gentle-cleanser", concern: "redness", level: "expert", summary: "Harsh cleansing worsens irritation; gentle non-soap cleansers are standard advice.", sources: ["draelos-2018-cleansers", "nrs-2019"] },
  { active: "gentle-cleanser", concern: "eczema", level: "expert", summary: "Gentle non-soap cleansers are standard advice for eczema-prone skin.", sources: ["draelos-2018-cleansers"] },
  { active: "moisturizer", concern: "sensitive", level: "expert", summary: "A healthy barrier makes skin less reactive; moisturisers help maintain it.", sources: ["aad-ad-2023"] },

  // Pigmentation
  { active: "sunscreen", concern: "hyperpigmentation", level: "moderate", summary: "Daily broad-spectrum protection is the foundation of treating dark spots and melasma — without it, other treatments are undone.", sources: ["fatima-2020"] },
  { active: "sunscreen", concern: "uneven-tone", level: "moderate", summary: "UV exposure drives uneven pigmentation; daily protection prevents it worsening.", sources: ["fatima-2020", "hughes-2013"] },
  { active: "azelaic-acid", concern: "hyperpigmentation", level: "moderate", summary: "Compared with hydroquinone (the standard lightening drug) for melasma in randomized trials, pooled in a 2023 meta-analysis. Studies used 20%; OTC products are 10%.", sources: ["albzea-2023", "schulte-2015"] },
  { active: "niacinamide", concern: "hyperpigmentation", level: "moderate", summary: "Reduced hyperpigmentation in controlled trials, including a 12-week split-face study.", sources: ["hakozaki-2002", "bissett-2005"] },
  { active: "niacinamide", concern: "uneven-tone", level: "moderate", summary: "Improved blotchiness and evenness in a 12-week split-face, vehicle-controlled trial.", sources: ["bissett-2005"] },
  { active: "vitamin-c", concern: "hyperpigmentation", level: "limited", summary: "Small trials show modest lightening; formulas oxidise and lose strength.", sources: ["telang-2013"] },
  { active: "tranexamic-acid", concern: "hyperpigmentation", level: "limited", summary: "Promising for melasma, but most of the strong data are for oral or injected forms; topical studies are small.", sources: ["taraz-2017"] },
  { active: "aha", concern: "hyperpigmentation", level: "limited", summary: "Can help fade surface pigment, but also increases UV sensitivity — daily sunscreen is essential.", sources: ["kornhauser-2010", "kornhauser-2009"] },
  { active: "aha", concern: "uneven-tone", level: "limited", summary: "Exfoliation evens out surface tone; mostly small studies.", sources: ["kornhauser-2010"] },

  // Aging
  { active: "sunscreen", concern: "fine-lines", level: "strong", summary: "In a 4.5-year randomized trial of 903 adults, daily sunscreen users showed no detectable increase in skin aging — 24% less than occasional users.", sources: ["hughes-2013"] },
  { active: "tretinoin", concern: "fine-lines", level: "strong", summary: "The best-proven topical anti-aging treatment, in randomized vehicle-controlled trials since 1988. Prescription only.", sources: ["weiss-1988"] },
  { active: "retinol", concern: "fine-lines", level: "moderate", summary: "0.4% retinol improved fine wrinkles versus placebo in a 24-week randomized trial.", sources: ["kafi-2007"] },
  { active: "niacinamide", concern: "fine-lines", level: "moderate", summary: "5% niacinamide improved fine lines in a 12-week split-face, vehicle-controlled trial.", sources: ["bissett-2005"] },
  { active: "vitamin-c", concern: "fine-lines", level: "limited", summary: "Small trials show modest benefit. With vitamin E and ferulic acid it doubled UV protection in a lab skin model.", sources: ["telang-2013", "lin-2005"] },
  { active: "hyaluronic-acid", concern: "fine-lines", level: "limited", summary: "A small 60-day study found hyaluronic acid creams improved hydration and elasticity.", sources: ["pavicic-2011"] },
  { active: "peptides", concern: "fine-lines", level: "limited", summary: "Evidence is mostly small, short, often manufacturer-funded studies.", sources: ["gorouhi-2009"] },
  { active: "aha", concern: "fine-lines", level: "limited", summary: "Some improvement in small studies; raises sun sensitivity.", sources: ["kornhauser-2010", "kornhauser-2009"] },

  // Texture & dullness
  { active: "retinol", concern: "texture", level: "limited", summary: "Retinoids increase cell turnover; trials of retinol focus on wrinkles rather than texture.", sources: ["kafi-2007"] },
  { active: "adapalene", concern: "texture", level: "limited", summary: "Clears the clogged pores behind bumpy texture in acne-prone skin.", sources: ["aad-acne-2024"] },
  { active: "aha", concern: "texture", level: "limited", summary: "Loosens dead surface cells for smoother skin; mostly small studies.", sources: ["kornhauser-2010"] },
  { active: "salicylic-acid", concern: "texture", level: "limited", summary: "Exfoliates inside pores; mostly small studies.", sources: ["kornhauser-2010"] },
  { active: "aha", concern: "dullness", level: "limited", summary: "Removing dead surface cells makes skin reflect light more evenly.", sources: ["kornhauser-2010"] },
  { active: "vitamin-c", concern: "dullness", level: "limited", summary: "Antioxidant brightening; small trials only.", sources: ["telang-2013"] },
  { active: "hyaluronic-acid", concern: "dullness", level: "limited", summary: "Well-hydrated skin looks more radiant; small studies.", sources: ["pavicic-2011"] },

  // Dryness & eczema
  { active: "moisturizer", concern: "eczema", level: "strong", summary: "Moisturisers are strongly recommended in the AAD's 2023 atopic dermatitis guideline. No single type has been proven clearly best — regular use matters most.", sources: ["aad-ad-2023"] },
  { active: "moisturizer", concern: "dryness", level: "moderate", summary: "Moisturisers improve skin hydration and barrier function in trials; the strongest data come from eczema.", sources: ["aad-ad-2023"] },
  { active: "colloidal-oatmeal", concern: "eczema", level: "limited", summary: "Anti-inflammatory and anti-itch effects in lab and small clinical studies.", sources: ["reynertson-2015"] },
  { active: "colloidal-oatmeal", concern: "dryness", level: "limited", summary: "Soothes itch associated with dry, irritated skin in small studies.", sources: ["reynertson-2015"] },
  { active: "hyaluronic-acid", concern: "dryness", level: "limited", summary: "Increased skin hydration in a small 60-day study.", sources: ["pavicic-2011"] },
  { active: "panthenol", concern: "dryness", level: "limited", summary: "Improves hydration and barrier repair in small studies.", sources: ["proksch-2017"] },
  { active: "panthenol", concern: "sensitive", level: "limited", summary: "Supports barrier repair in small studies.", sources: ["proksch-2017"] },

  // Under-eyes
  { active: "caffeine", concern: "dark-circles", level: "limited", summary: "May reduce puffiness; dark circles have several causes (pigment, thin skin, shadowing) and topicals help modestly.", sources: ["vrcek-2016"] },
  { active: "sunscreen", concern: "dark-circles", level: "expert", summary: "Sun protection helps prevent pigment-type dark circles from deepening.", sources: ["vrcek-2016"] },
];

/** The strongest evidence that any of these actives helps with a concern. */
export function bestClaim(actives: ActiveId[], concern: string): Claim | undefined {
  return CLAIMS.filter((c) => c.concern === concern && actives.includes(c.active)).sort(
    (a, b) => LEVEL_WEIGHT[b.level] - LEVEL_WEIGHT[a.level],
  )[0];
}

/** Every claim relevant to someone's concerns, strongest first. */
export function claimsFor(concerns: Set<string>): Claim[] {
  return CLAIMS.filter((c) => concerns.has(c.concern)).sort((a, b) => LEVEL_WEIGHT[b.level] - LEVEL_WEIGHT[a.level]);
}

export const sourcesFor = (ids: string[]) => ids.map((id) => SOURCES[id]).filter(Boolean);

/** Evidence notes for routine guidance that isn't about a specific product. */
export const PRACTICE = {
  sunscreenAmount: {
    level: "moderate" as EvidenceLevel,
    text: "SPF is tested at 2 mg/cm², but real-world application averages 0.4–1.0 mg/cm², which cuts protection a lot. Apply generously before going out, then reapply once within the first hour.",
    sources: ["petersen-2014"],
  },
  patchTest: {
    level: "expert" as EvidenceLevel,
    text: "Before using a new product on your face, do a use test: apply it twice a day to the same small patch (inner elbow or behind the ear) for 7 days. No redness or itch? Go ahead.",
    sources: ["nakada-2000"],
  },
  ahaSun: {
    level: "moderate" as EvidenceLevel,
    text: "In an FDA study, 10% glycolic acid increased skin's sensitivity to UV — wear sunscreen daily while using AHAs.",
    sources: ["kornhauser-2009"],
  },
  retinoidRamp: {
    level: "expert" as EvidenceLevel,
    text: "Dryness and peeling (retinoid dermatitis) are the most common side effects. Starting a few nights a week and building up is standard practice.",
    sources: ["aad-acne-2024"],
  },
  oneAtATime: {
    level: "expert" as EvidenceLevel,
    text: "Introduce one new product at a time, a couple of weeks apart, so you can tell what's causing a reaction — and what's actually working.",
    sources: [] as string[],
  },
};
