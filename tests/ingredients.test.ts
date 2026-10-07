import { describe, expect, it } from "vitest";
import { checkIngredients, parseIngredients, personalSignals, familiesToAvoid } from "@/lib/ingredients";
import type { ProductEntry } from "@/lib/types";
import { profileWith } from "./helpers";

const entry = (name: string, verdict: ProductEntry["verdict"], ingredients: string, reactions: ProductEntry["reactions"] = []): ProductEntry => ({
  id: name,
  name,
  category: "moisturizer",
  verdict,
  reactions,
  ingredients,
  addedAt: "2026-01-01",
});

describe("parseIngredients", () => {
  it("normalises a real-world INCI list", () => {
    const list = parseIngredients(
      "Ingredients: Aqua/Water/Eau, Glycerin, Parfum (Fragrance), Alcohol Denat., Linalool, Citrus Aurantium Dulcis (Orange) Peel Oil, CI 77891 (Titanium Dioxide) [+/- CI 77491]",
    );
    expect(list).toEqual(["water", "glycerin", "fragrance", "alcohol denat", "linalool", "citrus aurantium dulcis peel oil", "titanium dioxide", "ci 77491"]);
  });
});

describe("personal learning", () => {
  const products = [
    entry("A", "disliked", "water, glycerin, fragrance, shea butter", ["irritation"]),
    entry("B", "disliked", "water, dimethicone, linalool, coconut oil", ["redness"]),
    entry("C", "liked", "water, glycerin, shea butter, ceramide np"),
    entry("D", "disliked", "water, coconut oil, squalane", ["breakout"]),
  ];
  const profile = profileWith({ products });

  it("spots fragrance as a family pattern across different fragrance ingredients", () => {
    const sig = personalSignals(profile);
    const fam = sig.find((s) => s.key === "f:fragrance");
    expect(fam?.dislikedProducts).toEqual(["A", "B"]);
  });

  it("flags an ingredient that keeps showing up in problem products", () => {
    const sig = personalSignals(profile);
    expect(sig.some((s) => s.label === "coconut oil")).toBe(true);
    // shea butter appears in a liked product too, so it shouldn't be blamed
    expect(sig.some((s) => s.label === "shea butter")).toBe(false);
    // water is in everything
    expect(sig.some((s) => s.label === "water")).toBe(false);
  });

  it("warns about a new product using what it learned", () => {
    const w = checkIngredients("Water, Cocos Nucifera Oil, Parfum", profile);
    expect(w.map((x) => x.ingredient)).toEqual(expect.arrayContaining(["coconut oil", "fragrance"]));
    expect(w.find((x) => x.ingredient === "coconut oil")?.reasons[0]).toMatch(/2 products/);
  });

  it("respects ingredients the person cleared", () => {
    const w = checkIngredients("Water, Coconut Oil", { ...profile, cleared: ["coconut oil"] });
    expect(w.some((x) => x.ingredient === "coconut oil")).toBe(false);
  });

  it("uses quiz answers even with no history", () => {
    const fresh = profileWith({}, { avoidFragrance: true, acneProne: true, pregnant: true, allergies: ["lanolin"] });
    const w = checkIngredients("Water, Fragrance, Isopropyl Myristate, Retinol, Lanolin", fresh);
    expect(w.map((x) => x.ingredient).sort()).toEqual(["fragrance", "isopropyl myristate", "lanolin", "retinol"]);
    expect(familiesToAvoid(fresh).has("retinoid")).toBe(true);
  });

  it("stays quiet about mild actives for non-sensitive skin", () => {
    expect(checkIngredients("Water, Glycolic Acid, Niacinamide", profileWith({}, { sensitivity: "not" }))).toEqual([]);
  });
});
