import { rankFoundations, type FoundationDb, type MatchInput } from "./foundations";
import type { SkinModel } from "./learning";
import type { ProductEntry, Profile, Reaction } from "./types";

const SHADE_ONLY: Reaction[] = ["too-light", "too-dark", "too-pink", "too-yellow", "oxidized"];

export function foundationIdFor(entry: ProductEntry, db: FoundationDb): string | null {
  if (entry.shadeRef) return entry.shadeRef.split("::")[0];
  const hit = db.products.find((p) => p.brand === entry.brand && p.name === entry.name);
  return hit?.id ?? null;
}

export function matchInputFor(profile: Profile, model: SkinModel, db: FoundationDb): MatchInput {
  const liked = new Set<string>();
  const avoid = new Map<string, string>();
  for (const e of profile.products) {
    if (e.category !== "foundation") continue;
    const id = foundationIdFor(e, db);
    if (!id) continue;
    if (e.verdict === "liked") liked.add(id);
    if (e.verdict === "disliked") {
      const nonShade = e.reactions.filter((r) => !SHADE_ONLY.includes(r));
      if (e.reactions.length && !nonShade.length) continue; // only the shade was off — another shade may be perfect
      avoid.set(
        id,
        nonShade.length
          ? `You logged this formula as a miss (${nonShade.map((r) => r.replace("-", " ")).join(", ")}).`
          : "You logged this formula as a miss.",
      );
    }
  }
  return {
    target: model.target,
    undertoneAxis: model.undertoneAxis,
    olive: model.olive,
    finish: profile.quiz.finish,
    coverage: profile.quiz.coverage,
    skinType: profile.quiz.skinType,
    acneProne: profile.quiz.acneProne,
    budget: profile.preferences.budget,
    quality: profile.preferences.quality,
    liked,
    avoid,
  };
}

export function topFoundations(profile: Profile, model: SkinModel, db: FoundationDb) {
  return rankFoundations(db, matchInputFor(profile, model, db));
}
