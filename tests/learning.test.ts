import { describe, expect, it } from "vitest";
import { buildSkinModel, profileStrength } from "@/lib/learning";
import { deltaE2000 } from "@/lib/color";
import { parseProductList } from "@/lib/productParsing";
import { buildRoutine } from "@/lib/skincare";
import type { PhotoAnalysis } from "@/lib/types";
import { db, profileWith } from "./helpers";

const photo: PhotoAnalysis = {
  analyzedAt: "",
  hex: "#c99a7c",
  lab: { L: 67, a: 13, b: 20 },
  ita: 0,
  depth: "light-medium",
  undertone: "neutral",
  undertoneAxis: 0,
  quality: 0.8,
  warnings: [],
  concerns: [],
};

describe("skin model", () => {
  it("moves toward shades the person actually wears", () => {
    const [liked] = parseProductList("Fenty Pro Filt'r 330", "liked", db);
    expect(liked.entry.shadeRef).toBeTruthy();
    const shadeLab = db.shades.get(liked.entry.shadeRef!.split("::")[0])![Number(liked.entry.shadeRef!.split("::")[1])].lab;
    const before = buildSkinModel(profileWith({ photo }), db);
    const after = buildSkinModel(profileWith({ photo, products: [liked.entry] }), db);
    expect(deltaE2000(after.target, shadeLab)).toBeLessThan(deltaE2000(before.target, shadeLab));
    expect(after.confidence).toBeGreaterThan(before.confidence);
  });

  it("shifts darker when a worn shade was too light", () => {
    const [e] = parseProductList("Fenty Pro Filt'r 240", "disliked", db);
    e.entry.reactions = ["too-light"];
    const m = buildSkinModel(profileWith({ products: [e.entry] }), db);
    const shadeLab = db.shades.get(e.entry.shadeRef!.split("::")[0])![Number(e.entry.shadeRef!.split("::")[1])].lab;
    expect(m.target.L).toBeLessThan(shadeLab.L);
  });

  it("combines undertone clues", () => {
    const m = buildSkinModel(profileWith({}, { undertoneSelf: "warm", veins: "green", jewelry: "gold" }), db);
    expect(m.undertone).toBe("warm");
  });

  it("grows profile strength as things are logged", () => {
    const empty = profileStrength(profileWith());
    const lines = parseProductList("Fenty Pro Filt'r 240\nCeraVe Moisturizing Cream", "liked", db).map((l) => l.entry);
    const fuller = profileStrength(profileWith({ photo, products: lines, onboarding: { photo: true, quiz: true, products: true, budget: true } }));
    expect(fuller.score).toBeGreaterThan(empty.score);
  });
});

describe("routine", () => {
  it("skips fragrance and retinoids when asked", () => {
    const p = profileWith({}, { skinType: "oily", avoidFragrance: true, pregnant: true, concerns: ["acne", "fine-lines"] });
    const items = buildRoutine(p).flatMap((s) => s.picks.map((x) => x.item));
    expect(items.some((i) => i.contains.includes("fragrance") || i.contains.includes("retinoid"))).toBe(false);
    expect(items.some((i) => i.step === "sunscreen")).toBe(true);
  });
});

describe("free-form parsing", () => {
  it("splits lines, recognises foundations and inline reactions", () => {
    const lines = parseProductList("Maybelline Fit Me 220 — too pink, broke me out\n- CeraVe Hydrating Cleanser", "disliked", db);
    expect(lines).toHaveLength(2);
    expect(lines[0].entry.category).toBe("foundation");
    expect(lines[0].entry.shade).toContain("220");
    expect(lines[0].entry.reactions).toEqual(expect.arrayContaining(["too-pink", "breakout"]));
    expect(lines[1].entry.category).toBe("cleanser");
  });
});
