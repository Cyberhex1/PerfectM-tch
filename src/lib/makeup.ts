import { labToHex, shiftLab } from "./color";
import type { SkinModel } from "./learning";
import type { Depth, Profile, Undertone } from "./types";

export type Swatch = { name: string; hex: string };
export type MakeupSection = { title: string; summary: string; swatches?: Swatch[]; tips: string[] };

const DEEP: Depth[] = ["tan", "deep", "rich"];
const FAIR: Depth[] = ["fair", "light"];

const BLUSH: Record<Undertone, { light: Swatch[]; mid: Swatch[]; deep: Swatch[] }> = {
  cool: {
    light: [{ name: "Ballet pink", hex: "#E8A1B0" }, { name: "Soft rose", hex: "#D98A99" }, { name: "Mauve", hex: "#B9788A" }],
    mid: [{ name: "Rose", hex: "#C96F84" }, { name: "Berry", hex: "#A8486A" }, { name: "Mauve", hex: "#A86B7F" }],
    deep: [{ name: "Berry", hex: "#8E2F55" }, { name: "Plum", hex: "#74304F" }, { name: "Fuchsia", hex: "#B03873" }],
  },
  warm: {
    light: [{ name: "Peach", hex: "#F2A88A" }, { name: "Apricot", hex: "#E99A72" }, { name: "Coral", hex: "#E9826F" }],
    mid: [{ name: "Coral", hex: "#DE7458" }, { name: "Terracotta", hex: "#C0684C" }, { name: "Warm peach", hex: "#E48A66" }],
    deep: [{ name: "Burnt orange", hex: "#B5512D" }, { name: "Brick", hex: "#9A3F2C" }, { name: "Spiced copper", hex: "#A65B34" }],
  },
  neutral: {
    light: [{ name: "Dusty rose", hex: "#D9939A" }, { name: "Soft coral", hex: "#E59584" }, { name: "Nude pink", hex: "#D8A098" }],
    mid: [{ name: "Rosewood", hex: "#B86F70" }, { name: "Dusty coral", hex: "#CF7E6C" }, { name: "Mauve", hex: "#AA7180" }],
    deep: [{ name: "Raisin", hex: "#7A3A40" }, { name: "Rich berry", hex: "#8C3450" }, { name: "Brick rose", hex: "#9C4A45" }],
  },
  olive: {
    light: [{ name: "Warm rose", hex: "#D58A88" }, { name: "Soft terracotta", hex: "#D08A6E" }, { name: "Peachy pink", hex: "#E39A8C" }],
    mid: [{ name: "Terracotta", hex: "#B9644C" }, { name: "Warm rose", hex: "#B76B6B" }, { name: "Brick", hex: "#A5503E" }],
    deep: [{ name: "Brick", hex: "#8E3E2F" }, { name: "Wine", hex: "#6F2B36" }, { name: "Copper", hex: "#9B5532" }],
  },
};

const LIPS: Record<Undertone, Swatch[]> = {
  cool: [{ name: "Blue-red", hex: "#A3142E" }, { name: "Berry", hex: "#8A2350" }, { name: "Cool mauve", hex: "#9C6276" }],
  warm: [{ name: "Orange-red", hex: "#C2321F" }, { name: "Brick", hex: "#94392A" }, { name: "Coral", hex: "#D9644E" }],
  neutral: [{ name: "True red", hex: "#B21E2A" }, { name: "Rose", hex: "#B05E6A" }, { name: "Rosewood", hex: "#91545A" }],
  olive: [{ name: "Brick red", hex: "#9A3328" }, { name: "Terracotta", hex: "#A8553F" }, { name: "Wine", hex: "#6E1F33" }],
};

const EYES: Record<Undertone, Swatch[]> = {
  cool: [{ name: "Taupe", hex: "#8C7B78" }, { name: "Plum", hex: "#6C4157" }, { name: "Silver", hex: "#BFC1C6" }, { name: "Navy", hex: "#2E3A5C" }],
  warm: [{ name: "Bronze", hex: "#9A6A3A" }, { name: "Copper", hex: "#B26437" }, { name: "Gold", hex: "#C9A24F" }, { name: "Olive green", hex: "#6A6B3A" }],
  neutral: [{ name: "Champagne", hex: "#D8C3A0" }, { name: "Rose gold", hex: "#C69384" }, { name: "Soft brown", hex: "#8A6A55" }, { name: "Charcoal", hex: "#4A4A4F" }],
  olive: [{ name: "Gold", hex: "#C2A050" }, { name: "Plum", hex: "#6A3D52" }, { name: "Bronze", hex: "#946235" }, { name: "Deep teal", hex: "#2F5A5C" }],
};

const HIGHLIGHT: Record<"fair" | "mid" | "deep", Swatch> = {
  fair: { name: "Pearl champagne", hex: "#F3E3D3" },
  mid: { name: "Soft gold", hex: "#E8C88E" },
  deep: { name: "Bronze gold", hex: "#C88F45" },
};

export function makeupSuggestions(model: SkinModel, profile: Profile): MakeupSection[] {
  const q = profile.quiz;
  const band = FAIR.includes(model.depth) ? "light" : DEEP.includes(model.depth) ? "deep" : "mid";
  const ut = model.undertone;
  const concerns = new Set(q.concerns);
  const sections: MakeupSection[] = [];

  // Primer
  const primerTips: string[] = [];
  if (q.skinType === "oily" || q.skinType === "combination")
    primerTips.push("A mattifying or pore-blurring primer on the T-zone keeps foundation in place longer.");
  if (q.skinType === "dry") primerTips.push("Reach for a hydrating primer (or just let your moisturizer sink in for 5 minutes).");
  if (concerns.has("redness") || concerns.has("rosacea"))
    primerTips.push(
      band === "light"
        ? "A sheer green colour-correcting primer cancels redness before foundation."
        : "Use a sheer green corrector only on red spots — on deeper skin it can look ashy all over.",
    );
  if (concerns.has("texture")) primerTips.push("Silicone-based smoothing primers fill in texture; press, don't rub.");
  if (!primerTips.length) primerTips.push("Primer is optional for you — sunscreen often doubles as one.");
  sections.push({ title: "Prep & primer", summary: "Sets up your base so it lasts.", tips: primerTips });

  // Concealer
  const under = labToHex(shiftLab(model.target, 4, -0.5, 1));
  const match = model.hex;
  const corrector =
    band === "light" ? { name: "Peach corrector", hex: "#F0BFA0" } : band === "mid" ? { name: "Apricot corrector", hex: "#E39A6A" } : { name: "Orange-red corrector", hex: "#C5603A" };
  sections.push({
    title: "Concealer",
    summary: "One shade for brightening, one for covering spots.",
    swatches: [
      { name: "Under-eye (½–1 shade lighter)", hex: under },
      { name: "Spot cover (exact match)", hex: match },
      ...(concerns.has("dark-circles") ? [corrector] : []),
    ],
    tips: [
      "Under the eyes, go no more than one shade lighter — any more looks grey on camera.",
      "For blemishes, use your exact foundation shade and a small brush.",
      ...(concerns.has("dark-circles") ? [`Dark circles? Tap a thin layer of ${corrector.name.toLowerCase()} first, then concealer.`] : []),
    ],
  });

  // Blush
  sections.push({
    title: "Blush",
    summary: `Shades that flatter ${ut} undertones at your depth.`,
    swatches: BLUSH[ut][band],
    tips: [
      q.skinType === "oily" ? "Powder blush lasts longest on oily skin." : q.skinType === "dry" ? "Cream or liquid blush melts in rather than sitting on dry patches." : "Cream for a fresh look, powder for staying power.",
    ],
  });

  // Bronzer & contour
  const bronzer = labToHex(shiftLab(model.target, -9, ut === "cool" ? 1 : 2, ut === "cool" ? 0 : 3));
  const contour = labToHex(shiftLab(model.target, -11, -1, -4));
  sections.push({
    title: "Bronzer & contour",
    summary: "1–2 shades deeper than your skin.",
    swatches: [
      { name: "Bronzer (warmth)", hex: bronzer },
      { name: "Contour (shadow)", hex: contour },
    ],
    tips: [
      ut === "cool" ? "Avoid very orange bronzers — neutral or slightly rosy browns look most natural on you." : "Warm, golden bronzers suit you well.",
      "Contour should be cooler and greyer than bronzer — it mimics a shadow.",
    ],
  });

  // Highlighter
  sections.push({
    title: "Highlighter",
    summary: "Catches light on cheekbones, brow bone, cupid's bow.",
    swatches: [HIGHLIGHT[band === "light" ? "fair" : band]],
    tips: [q.skinType === "oily" || concerns.has("texture") ? "Keep it to the very top of the cheekbone — shimmer can emphasize texture and shine." : "A liquid highlighter under foundation gives a lit-from-within glow."],
  });

  // Lips
  const nude = labToHex(shiftLab(model.target, band === "deep" ? -6 : -12, 7, -2));
  sections.push({
    title: "Lips",
    summary: "Your everyday nude plus a few statement shades.",
    swatches: [{ name: "Your nude", hex: nude }, ...LIPS[ut]],
    tips: ["The most flattering nude is usually a touch deeper and pinker than your skin — not the same colour."],
  });

  // Eyes
  sections.push({
    title: "Eyes",
    summary: "Shadow families that harmonize with your undertone.",
    swatches: EYES[ut],
    tips: [band === "deep" ? "Rich jewel tones and metallics show up beautifully on deeper skin." : "Matte transition shades a little deeper than your skin make blending effortless."],
  });

  // Setting
  sections.push({
    title: "Setting",
    summary: "Locks everything in.",
    tips:
      q.skinType === "oily" || q.climate === "humid"
        ? ["Translucent loose powder on the T-zone, then a setting spray.", "Blotting papers beat re-powdering through the day."]
        : q.skinType === "dry"
          ? ["Skip all-over powder; use a hydrating setting spray instead.", "If you need powder, press a tiny amount only where you crease."]
          : ["Light powder where you get shiny, plus a setting spray."],
  });

  return sections;
}
