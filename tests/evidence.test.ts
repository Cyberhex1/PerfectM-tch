import { describe, expect, it } from "vitest";
import { ACTIVES, CLAIMS, LEVEL_WEIGHT, PRACTICE, SOURCES } from "@/lib/evidence";
import { RULES } from "@/lib/ingredients";
import { buildRoutine, CATALOG, lookFor } from "@/lib/skincare";
import { profileWith } from "./helpers";

describe("evidence integrity", () => {
  it("every claim, irritant rule and practice note cites sources that exist", () => {
    const cited = [
      ...CLAIMS.flatMap((c) => c.sources),
      ...RULES.flatMap((r) => r.evidence.sources),
      ...Object.values(PRACTICE).flatMap((p) => p.sources),
    ];
    for (const id of cited) expect(SOURCES[id], id).toBeDefined();
  });

  it("only expert-consensus claims may go without a citation", () => {
    for (const c of CLAIMS) if (c.level !== "expert") expect(c.sources.length, `${c.active}/${c.concern}`).toBeGreaterThan(0);
    for (const r of RULES) if (r.evidence.level !== "expert") expect(r.evidence.sources.length, String(r.match)).toBeGreaterThan(0);
  });

  it("every source links to its PubMed record", () => {
    for (const s of Object.values(SOURCES)) expect(s.url).toBe(`https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`);
  });

  it("every catalog product's actives are known", () => {
    for (const item of CATALOG) for (const a of item.actives) expect(ACTIVES[a], `${item.id}: ${a}`).toBeDefined();
  });
});

describe("evidence-ranked recommendations", () => {
  const acneProne = profileWith({}, { skinType: "oily", sensitivity: "not", acneProne: true, concerns: ["acne"], routineEffort: "moderate" });

  it("reaches for guideline-backed acne treatments over weaker ones", () => {
    const routine = buildRoutine(acneProne);
    const firstPicks = routine.map((s) => s.picks[0].item);
    // benzoyl peroxide and topical retinoids are the AAD's strong recommendations
    expect(firstPicks.some((i) => i.actives.includes("benzoyl-peroxide"))).toBe(true);
    expect(firstPicks.some((i) => i.actives.includes("adapalene"))).toBe(true);
  });

  it("ranks the ingredients to look for strongest-first", () => {
    const list = lookFor(acneProne);
    for (let i = 1; i < list.length; i++) expect(LEVEL_WEIGHT[list[i - 1].level]).toBeGreaterThanOrEqual(LEVEL_WEIGHT[list[i].level]);
    expect(list[0].level).toBe("strong");
  });

  it("picks a retinoid with anti-aging evidence for fine lines, and attaches the sunscreen-amount note", () => {
    const routine = buildRoutine(profileWith({}, { skinType: "normal", sensitivity: "not", concerns: ["fine-lines"] }));
    const night = routine.find((s) => s.when === "PM" && s.step === "treatment");
    expect(night?.picks[0].item.actives).toContain("retinol");
    expect(night?.picks[0].evidence[0].concern).toBe("fine-lines");
    expect(routine.find((s) => s.step === "sunscreen")?.note?.sources).toContain("petersen-2014");
  });

  it("leaves retinoids out of everything during pregnancy", () => {
    const p = profileWith({}, { pregnant: true, concerns: ["acne", "fine-lines"] });
    expect(lookFor(p).some((a) => ["adapalene", "retinol", "tretinoin"].includes(a.active))).toBe(false);
    expect(buildRoutine(p).flatMap((s) => s.picks).some((x) => x.item.contains.includes("retinoid"))).toBe(false);
  });
});
