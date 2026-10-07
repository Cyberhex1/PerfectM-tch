"use client";

import { useMemo } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { Badge, Card, Eyebrow, H2, Notice } from "@/components/ui";
import { FAMILY_LABEL, familiesToAvoid, personalSignals } from "@/lib/ingredients";
import { buildRoutine, lookFor } from "@/lib/skincare";

export default function SkincarePage() {
  const { profile, model } = useProfile();
  const routine = useMemo(() => buildRoutine(profile, model.depth), [profile, model.depth]);
  const look = useMemo(() => lookFor(profile), [profile]);
  const avoid = useMemo(() => [...familiesToAvoid(profile, personalSignals(profile))], [profile]);
  const groups = [
    { when: "Morning", steps: routine.filter((s) => s.when === "AM" || s.when === "AM & PM") },
    { when: "Evening", steps: routine.filter((s) => s.when === "PM" || s.when === "AM & PM") },
    { when: "As needed", steps: routine.filter((s) => s.when === "As needed") },
  ].filter((g) => g.steps.length);

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>Skincare</Eyebrow>
        <H2 className="mt-2">A routine built around your skin.</H2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Picks are filtered for your skin type, concerns, budget and anything your profile has learned to avoid.
          Introduce one new product at a time, two weeks apart, so you can tell what&apos;s working.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="font-medium">Ingredients to look for</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {look.length ? look.map((l) => <Badge key={l} tone="good">{l}</Badge>) : <span className="text-sm text-muted">Pick concerns in the quiz to see these.</span>}
          </div>
        </Card>
        <Card>
          <p className="font-medium">We&apos;re steering you away from</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {avoid.length ? avoid.map((f) => <Badge key={f} tone="bad">{FAMILY_LABEL[f]}</Badge>) : <span className="text-sm text-muted">Nothing yet — we&apos;ll learn as you log products.</span>}
          </div>
        </Card>
      </div>

      {groups.map((g) => (
        <section key={g.when}>
          <h3 className="mb-3 font-display text-2xl">{g.when}</h3>
          <ol className="space-y-3">
            {g.steps.map((s, i) =>
              g.when === "Evening" && s.when === "AM & PM" ? (
                <li key={`${g.when}-${s.title}`}>
                  <Card className="flex items-baseline gap-3 p-4 sm:p-5">
                    <span className="font-display text-xl text-accent">{i + 1}</span>
                    <p className="flex-1">
                      <span className="font-medium">{s.title}</span>
                      <span className="text-sm text-muted"> — same as morning ({s.picks[0].item.brand} {s.picks[0].item.name})</span>
                    </p>
                  </Card>
                </li>
              ) : (
              <li key={`${g.when}-${s.title}`}>
                <Card className="p-4 sm:p-5">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-xl text-accent">{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium">{s.title}</p>
                      <p className="mt-0.5 text-sm text-muted">{s.tip}</p>
                    </div>
                  </div>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {s.picks.map((p, j) => (
                      <li key={p.item.id} className="rounded-2xl bg-canvas p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.12em] text-muted">{p.liked ? "Already a favourite" : j === 0 ? "Best fit" : "Alternative"}</p>
                            <p className="mt-1 font-medium">{p.item.brand}</p>
                            <p className="text-sm">{p.item.name}</p>
                          </div>
                          <span className="whitespace-nowrap text-sm text-muted">≈ ${p.item.price}</span>
                        </div>
                        <p className="mt-2 text-xs text-muted">{p.item.keyIngredients.join(" · ")}</p>
                        {p.why.length > 0 && <p className="mt-2 text-xs text-good">✓ {p.why.slice(0, 2).join(", ")}</p>}
                        {p.item.note && <p className="mt-1 text-xs text-muted">{p.item.note}</p>}
                        {p.caution && <p className="mt-1 text-xs text-warn">! {p.caution}</p>}
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
              ),
            )}
          </ol>
        </section>
      ))}

      <Notice>
        Prices are approximate US retail and formulas change — check the current ingredient list (or paste it into the
        Ingredients tab) before you buy. This isn&apos;t medical advice; for persistent acne, rosacea or eczema, a
        dermatologist can prescribe stronger options.
      </Notice>
    </div>
  );
}
