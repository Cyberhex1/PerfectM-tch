export type Lab = { L: number; a: number; b: number };

export type Undertone = "cool" | "neutral" | "warm" | "olive";
export type Depth = "fair" | "light" | "light-medium" | "medium" | "tan" | "deep" | "rich";

export type SkinType = "dry" | "normal" | "combination" | "oily";
export type Sensitivity = "not" | "somewhat" | "very";
export type Coverage = "light" | "medium" | "full";
export type Finish = "matte" | "natural" | "radiant";

export type ConcernKey =
  | "acne"
  | "redness"
  | "hyperpigmentation"
  | "uneven-tone"
  | "dryness"
  | "oiliness"
  | "texture"
  | "fine-lines"
  | "dark-circles"
  | "dullness"
  | "rosacea"
  | "eczema";

export type DetectedConcern = {
  key: ConcernKey;
  /** 0–1, how strongly it showed up */
  score: number;
  confidence: "low" | "medium" | "high";
  note: string;
};

/** Raw 0–1 readings for every tracked concern — recorded even when low, so they can be charted over time. */
export type SkinMetrics = Record<"redness" | "oiliness" | "uneven-tone" | "texture" | "hyperpigmentation", number>;

export type PhotoAnalysis = {
  analyzedAt: string;
  /** average sampled skin colour */
  hex: string;
  lab: Lab;
  /** Individual Typology Angle — standard dermatology measure of skin lightness */
  ita: number;
  depth: Depth;
  undertone: Undertone;
  /** -1 (cool) … +1 (warm) */
  undertoneAxis: number;
  /** 0–1: how much we trust the photo (lighting, exposure, evenness) */
  quality: number;
  warnings: string[];
  concerns: DetectedConcern[];
  metrics?: SkinMetrics;
  ai?: { model: string; summary: string; concerns: DetectedConcern[] };
};

export type QuizAnswers = {
  skinType?: SkinType;
  sensitivity?: Sensitivity;
  concerns: ConcernKey[];
  acneProne?: boolean;
  avoidFragrance?: boolean;
  /** ingredients the person knows they react to */
  allergies: string[];
  depthSelf?: Depth;
  undertoneSelf?: Undertone | "unsure";
  veins?: "blue-purple" | "green" | "mix" | "unsure";
  jewelry?: "silver" | "gold" | "both" | "unsure";
  sunReaction?: "burns" | "burns-then-tans" | "tans" | "rarely-burns";
  coverage?: Coverage;
  finish?: Finish;
  climate?: "humid" | "dry" | "mixed";
  routineEffort?: "minimal" | "moderate" | "full";
  pregnant?: boolean;
  makeupGoals: string[];
};

export type ProductCategory =
  | "foundation"
  | "concealer"
  | "powder"
  | "blush"
  | "bronzer"
  | "lip"
  | "eye"
  | "primer"
  | "cleanser"
  | "moisturizer"
  | "serum"
  | "sunscreen"
  | "toner"
  | "exfoliant"
  | "mask"
  | "other";

export type Verdict = "liked" | "disliked" | "neutral";

export type Reaction =
  | "breakout"
  | "irritation"
  | "redness"
  | "itching"
  | "dryness"
  | "greasy"
  | "too-light"
  | "too-dark"
  | "too-pink"
  | "too-yellow"
  | "oxidized"
  | "cakey"
  | "patchy";

export type ProductEntry = {
  id: string;
  name: string;
  brand?: string;
  category: ProductCategory;
  verdict: Verdict;
  reactions: Reaction[];
  /** foundation shade label as the person typed it */
  shade?: string;
  /** link into the foundation dataset: `${productId}::${shadeIndex}` */
  shadeRef?: string;
  /** raw INCI ingredient list */
  ingredients?: string;
  ingredientsSource?: "user" | "open-beauty-facts";
  notes?: string;
  /** where the entry came from; quiz entries are replaced if the quiz is retaken */
  source?: "quiz" | "manual";
  /** the line exactly as the person typed it */
  raw?: string;
  addedAt: string;
};

export type Preferences = {
  /** comfortable spend per product, USD */
  budget: number;
  /** 0 = value first … 100 = best-in-class regardless */
  quality: number;
};

export type Profile = {
  version: 1;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
  photo?: PhotoAnalysis;
  quiz: QuizAnswers;
  preferences: Preferences;
  products: ProductEntry[];
  /** ingredients the person added to their avoid list by hand */
  watchlist: string[];
  /** ingredients the person said are fine for them (suppresses warnings) */
  cleared: string[];
  onboarding: { photo: boolean; quiz: boolean; products: boolean; budget: boolean };
  /** skin tone the person picked themselves — overrides the photo, which cameras often lighten */
  toneOverride?: { lab: Lab; setAt: string };
  /** photo gallery preference — undefined until the person has chosen */
  gallery?: { enabled: boolean; decidedAt: string };
};

export const emptyProfile = (now = new Date().toISOString()): Profile => {
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    quiz: { concerns: [], allergies: [], makeupGoals: [] },
    preferences: { budget: 35, quality: 50 },
    products: [],
    watchlist: [],
    cleared: [],
    onboarding: { photo: false, quiz: false, products: false, budget: false },
  };
};
