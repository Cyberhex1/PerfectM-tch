import { describe, expect, it } from "vitest";
import { guessFoundation, rankFoundations, type MatchInput } from "@/lib/foundations";
import { db } from "./helpers";

describe("guessFoundation", () => {
  it.each([
    ["Fenty Pro Filt'r 240", "FENTY BEAUTY by Rihanna", "240"],
    ["Estee Lauder Double Wear 2N1 Desert", "Estée Lauder", "2N1"],
    ["MUFE Ultra HD Y375", "MAKE UP FOR EVER", "Y375"],
  ])("recognises %s", (text, brand, shade) => {
    const g = guessFoundation(db, text);
    expect(g?.product.brand).toBe(brand);
    expect(g?.shade?.label).toContain(shade);
  });

  it("does not invent matches for skincare", () => {
    expect(guessFoundation(db, "CeraVe Moisturizing Cream")).toBeNull();
  });
});

describe("rankFoundations", () => {
  const base: MatchInput = {
    target: { L: 0, a: 0, b: 0 },
    undertoneAxis: 0,
    olive: false,
    budget: 100,
    quality: 50,
    liked: new Set(),
    avoid: new Map(),
  };

  it("puts the exact shade first when the target equals a shade", () => {
    const fenty = db.products.find((p) => p.brand.startsWith("FENTY") && /Pro Filt/.test(p.name))!;
    const shade = db.shades.get(fenty.id)![20];
    const res = rankFoundations(db, { ...base, target: shade.lab, liked: new Set([fenty.id]) });
    expect(res[0].product.id).toBe(fenty.id);
    expect(res[0].shade.ref).toBe(shade.ref);
    expect(res[0].deltaE).toBeLessThan(0.01);
  });

  it("pushes avoided products down", () => {
    const target = { L: 65, a: 12, b: 22 };
    const first = rankFoundations(db, { ...base, target })[0];
    const again = rankFoundations(db, { ...base, target, avoid: new Map([[first.product.id, "broke you out"]]) });
    expect(again[0].product.id).not.toBe(first.product.id);
  });

  it("respects a tight budget", () => {
    const res = rankFoundations(db, { ...base, target: { L: 65, a: 12, b: 22 }, budget: 15, quality: 20 });
    expect(res.slice(0, 5).every((m) => m.product.tier <= 2)).toBe(true);
  });
});

describe("feedback loop", () => {
  it("moves past a shade reported as too light", async () => {
    const { matchInputFor } = await import("@/lib/recommend");
    const { buildSkinModel } = await import("@/lib/learning");
    const { profileWith } = await import("./helpers");
    const base = profileWith({}, { depthSelf: "medium" });
    const first = rankFoundations(db, matchInputFor(base, buildSkinModel(base, db), db))[0];
    const withFeedback = profileWith(
      {
        products: [
          {
            id: "x",
            name: first.product.name,
            brand: first.product.brand,
            category: "foundation",
            shadeRef: first.shade.ref,
            verdict: "disliked",
            reactions: ["too-light"],
            addedAt: "",
          },
        ],
      },
      { depthSelf: "medium" },
    );
    const after = rankFoundations(db, matchInputFor(withFeedback, buildSkinModel(withFeedback, db), db));
    expect(after[0].shade.ref).not.toBe(first.shade.ref);
    // every top pick is now darker than the shade that was too light
    expect(after.slice(0, 5).every((m) => m.shade.lab.L < first.shade.lab.L)).toBe(true);
  });
});
