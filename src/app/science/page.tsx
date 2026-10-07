import type { Metadata } from "next";
import { Citation, EvidenceBadge } from "@/components/Evidence";
import { Card, Eyebrow, H2, Title } from "@/components/ui";
import { CLAIMS, LEVEL_DEFINITION, LEVEL_WEIGHT, SOURCES, type EvidenceLevel, type SourceType } from "@/lib/evidence";

export const metadata: Metadata = {
  title: "How we use science",
  description: "How PerfectMatch grades evidence for skincare ingredients and irritants, with every source.",
};

const LEVELS: EvidenceLevel[] = ["strong", "moderate", "limited", "expert"];
const TYPE_LABEL: Record<SourceType, string> = {
  guideline: "Clinical guidelines",
  "meta-analysis": "Meta-analyses",
  rct: "Randomized controlled trials",
  review: "Reviews",
  study: "Clinical & laboratory studies",
  regulation: "Regulations",
};

const LIMITS = [
  {
    title: "Your photo",
    body: "Skin colour from a daylight photo is a useful starting point, but cameras and lighting shift it, so worn shades you log always outweigh it. Spotting redness, shine or texture from a photo is a rough on-screen estimate, not a diagnosis. Low-confidence readings never drive your skincare picks.",
  },
  {
    title: "Your ingredient patterns",
    body: "When an ingredient keeps showing up in products that bothered you, that's a pattern worth noticing, not proof. Products contain dozens of ingredients, and reactions have many causes. If you suspect a true allergy, patch testing by a dermatologist is the standard way to confirm it.",
  },
  {
    title: "Ingredients vs. products",
    body: "The evidence is about ingredients at the strengths that were studied. Brands often don't disclose concentrations, so a product containing a proven ingredient isn't guaranteed to match the trial. We note when a product's strength differs from the research (e.g. 10% vs 15–20% azelaic acid).",
  },
  {
    title: "What we don't flag",
    body: "We only warn about ingredients with published evidence of irritation or allergy. We don't flag things because of “clean beauty” marketing, “chemical-free” claims or vague “toxin” fears. A synthetic ingredient isn't worse than a natural one by default. Essential oils, for example, are natural and are well-documented allergens.",
  },
];

export default function SciencePage() {
  const used = new Set([...CLAIMS.flatMap((c) => c.sources)]);
  const byType = new Map<SourceType, (typeof SOURCES)[string][]>();
  for (const s of Object.values(SOURCES)) byType.set(s.type, [...(byType.get(s.type) ?? []), s]);

  return (
    <div className="mx-auto max-w-3xl space-y-12 px-5 py-12">
      <div>
        <Eyebrow>How we use science</Eyebrow>
        <Title className="mt-3">Evidence first, marketing never.</Title>
        <p className="mt-5 leading-relaxed text-muted">
          Every skincare recommendation and every ingredient warning in PerfectMatch is tied to published dermatology
          research and graded by how strong that research is. Products are ranked by the evidence behind their active
          ingredients for <em>your</em> concerns, so an ingredient backed by clinical guidelines beats one that only
          looked good in a lab dish. Every source below was checked against its PubMed record.
        </p>
      </div>

      <section>
        <H2>How we grade evidence</H2>
        <ul className="mt-5 space-y-3">
          {LEVELS.map((l) => (
            <li key={l}>
              <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
                <EvidenceBadge level={l} className="self-start" />
                <p className="flex-1 text-sm leading-relaxed">{LEVEL_DEFINITION[l]}</p>
                <span className="text-xs text-faint">ranking weight ×{LEVEL_WEIGHT[l]}</span>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Grades are adapted from the GRADE approach used by the American Academy of Dermatology&apos;s guidelines. A
          strong guideline recommendation counts four times as much as expert opinion when we rank products.
        </p>
      </section>

      <section>
        <H2>What we&apos;re honest about</H2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {LIMITS.map((l) => (
            <Card key={l.title} className="p-4 sm:p-5">
              <p className="font-medium">{l.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{l.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <H2>Sources</H2>
        <p className="mt-2 text-sm text-muted">
          {Object.keys(SOURCES).length} publications · {used.size} back ingredient benefits, the rest back irritant warnings and
          routine advice.
        </p>
        <div className="mt-6 space-y-8">
          {(Object.keys(TYPE_LABEL) as SourceType[])
            .filter((t) => byType.has(t))
            .map((t) => (
              <div key={t}>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted">{TYPE_LABEL[t]}</p>
                <ul className="space-y-2.5">
                  {byType
                    .get(t)!
                    .sort((a, b) => b.year - a.year)
                    .map((s) => (
                      <Citation key={s.id} source={s} />
                    ))}
                </ul>
              </div>
            ))}
        </div>
      </section>

      <p className="rounded-2xl border border-line bg-surface px-5 py-4 text-sm leading-relaxed text-muted">
        PerfectMatch gives cosmetic guidance, not medical advice. See a dermatologist for acne that scars or
        doesn&apos;t improve after 8–12 weeks of consistent treatment, a rash that spreads or blisters, a changing
        mole, or any skin problem that affects your quality of life. Prescription treatments are often far more
        effective than anything sold over the counter.
      </p>
    </div>
  );
}
