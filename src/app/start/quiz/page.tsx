"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { concernLabel } from "@/components/PhotoAnalyzer";
import { useProfile } from "@/components/ProfileProvider";
import { Button, Chip, Eyebrow, Input, OptionCard, Swatch } from "@/components/ui";
import { DEPTH_ORDER, DEPTH_REFERENCE, labToHex } from "@/lib/color";
import type { ConcernKey, QuizAnswers } from "@/lib/types";

const CONCERNS: ConcernKey[] = [
  "acne",
  "redness",
  "hyperpigmentation",
  "uneven-tone",
  "dryness",
  "oiliness",
  "texture",
  "fine-lines",
  "dark-circles",
  "dullness",
  "rosacea",
  "eczema",
];
const ALLERGY_SUGGESTIONS = ["Fragrance", "Essential oils", "Coconut oil", "Lanolin", "Alcohol denat", "Methylisothiazolinone", "Salicylic acid", "Benzoyl peroxide", "Niacinamide", "Retinol"];

type Q = { title: string; subtitle?: string; done: (q: QuizAnswers) => boolean; render: () => ReactNode };

export default function QuizStep() {
  const router = useRouter();
  const { profile, update, ready } = useProfile();
  const [i, setI] = useState(0);
  const [allergyText, setAllergyText] = useState("");
  const q = profile.quiz;
  const set = (patch: Partial<QuizAnswers>) => update((p) => ({ ...p, quiz: { ...p.quiz, ...patch } }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const photoConcerns = (profile.photo?.concerns ?? []).filter((c) => c.score >= 0.4).map((c) => c.key);

  const addAllergy = (v: string) => {
    const clean = v.trim();
    if (clean && !q.allergies.some((a) => a.toLowerCase() === clean.toLowerCase())) set({ allergies: [...q.allergies, clean] });
    setAllergyText("");
  };

  const questions: Q[] = [
    {
      title: "By midday, without any products, your skin feels…",
      done: (q) => !!q.skinType,
      render: () => (
        <div className="space-y-2.5">
          {(
            [
              ["dry", "Tight or flaky", "Rarely shiny; can feel rough or look dull."],
              ["normal", "Comfortable", "Not tight, not shiny — just skin."],
              ["combination", "Shiny in the T-zone", "Oily forehead/nose, normal or dry cheeks."],
              ["oily", "Shiny all over", "Visible oil by lunchtime; makeup slides."],
            ] as const
          ).map(([v, t, d]) => (
            <OptionCard key={v} title={t} description={d} selected={q.skinType === v} onClick={() => set({ skinType: v })} />
          ))}
        </div>
      ),
    },
    {
      title: "When you try a new product, your skin usually…",
      done: (q) => !!q.sensitivity,
      render: () => (
        <div className="space-y-2.5">
          <OptionCard title="Handles it fine" description="Reactions are rare." selected={q.sensitivity === "not"} onClick={() => set({ sensitivity: "not" })} />
          <OptionCard title="Sometimes stings or goes pink" description="Certain products bother it." selected={q.sensitivity === "somewhat"} onClick={() => set({ sensitivity: "somewhat" })} />
          <OptionCard title="Reacts easily" description="Redness, stinging, itching or bumps are common." selected={q.sensitivity === "very"} onClick={() => set({ sensitivity: "very" })} />
        </div>
      ),
    },
    {
      title: "What would you like to work on?",
      subtitle: "Pick as many as you like.",
      done: () => true,
      render: () => (
        <div>
          {photoConcerns.length > 0 && (
            <p className="mb-4 text-sm text-muted">
              Your photo hinted at: {photoConcerns.map(concernLabel).join(", ")}. Add them if they ring true.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {CONCERNS.map((c) => (
              <Chip key={c} selected={q.concerns.includes(c)} onClick={() => set({ concerns: toggle(q.concerns, c) })}>
                {concernLabel(c)}
              </Chip>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "A few things to steer clear of",
      done: (q) => q.acneProne !== undefined && q.avoidFragrance !== undefined,
      render: () => (
        <div className="space-y-7">
          <YesNo label="Do new products often break you out?" value={q.acneProne} onChange={(v) => set({ acneProne: v })} />
          <YesNo label="Do you prefer to avoid fragrance?" value={q.avoidFragrance} onChange={(v) => set({ avoidFragrance: v })} />
          <div>
            <p className="mb-2.5 font-medium">Any ingredients you already know you react to?</p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addAllergy(allergyText);
              }}
            >
              <Input value={allergyText} onChange={(e) => setAllergyText(e.target.value)} placeholder="e.g. lanolin" />
              <Button type="submit" variant="secondary" disabled={!allergyText.trim()}>
                Add
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.allergies.map((a) => (
                <Chip key={a} selected onClick={() => set({ allergies: q.allergies.filter((x) => x !== a) })}>
                  {a} ✕
                </Chip>
              ))}
              {ALLERGY_SUGGESTIONS.filter((s) => !q.allergies.some((a) => a.toLowerCase() === s.toLowerCase())).map((s) => (
                <Chip key={s} onClick={() => addAllergy(s)} className="text-muted">
                  + {s}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Which looks closest to your skin?",
      subtitle: profile.photo ? `Your photo read as ${profile.photo.depth.replace("-", " ")}. Screens vary, so pick what feels right.` : "Screens vary — pick what feels closest.",
      done: (q) => !!q.depthSelf,
      render: () => (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {DEPTH_ORDER.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => set({ depthSelf: d })}
              aria-pressed={q.depthSelf === d}
              className="flex flex-col items-center gap-2 rounded-2xl p-2 text-xs capitalize transition hover:bg-ink/5"
            >
              <Swatch
                hex={labToHex(DEPTH_REFERENCE[d])}
                size={52}
                className={q.depthSelf === d ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : ""}
              />
              {d.replace("-", " ")}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Undertone clues",
      subtitle: "Not sure? That's normal — answer what you can.",
      done: (q) => !!q.undertoneSelf,
      render: () => (
        <div className="space-y-7">
          <ChoiceRow
            label="If you know your undertone, it's…"
            value={q.undertoneSelf}
            options={[["cool", "Cool / pink"], ["neutral", "Neutral"], ["warm", "Warm / golden"], ["olive", "Olive"], ["unsure", "Not sure"]]}
            onChange={(v) => set({ undertoneSelf: v })}
          />
          <ChoiceRow
            label="The veins on your inner wrist look…"
            value={q.veins}
            options={[["blue-purple", "Blue / purple"], ["green", "Green"], ["mix", "A mix"], ["unsure", "Can't tell"]]}
            onChange={(v) => set({ veins: v })}
          />
          <ChoiceRow
            label="Which jewellery flatters you more?"
            value={q.jewelry}
            options={[["silver", "Silver"], ["gold", "Gold"], ["both", "Both"], ["unsure", "Not sure"]]}
            onChange={(v) => set({ jewelry: v })}
          />
        </div>
      ),
    },
    {
      title: "How do you like your base?",
      done: (q) => !!q.coverage && !!q.finish,
      render: () => (
        <div className="space-y-7">
          <ChoiceRow
            label="Coverage"
            value={q.coverage}
            options={[["light", "Sheer / light"], ["medium", "Medium"], ["full", "Full"]]}
            onChange={(v) => set({ coverage: v })}
          />
          <ChoiceRow
            label="Finish"
            value={q.finish}
            options={[["matte", "Matte"], ["natural", "Natural"], ["radiant", "Dewy / radiant"]]}
            onChange={(v) => set({ finish: v })}
          />
        </div>
      ),
    },
    {
      title: "Your day-to-day",
      done: (q) => !!q.climate && !!q.routineEffort,
      render: () => (
        <div className="space-y-7">
          <ChoiceRow label="Your climate is mostly…" value={q.climate} options={[["humid", "Humid"], ["dry", "Dry"], ["mixed", "It changes"]]} onChange={(v) => set({ climate: v })} />
          <ChoiceRow
            label="How much routine do you want?"
            value={q.routineEffort}
            options={[["minimal", "3 steps, max"], ["moderate", "A few steps"], ["full", "I love a routine"]]}
            onChange={(v) => set({ routineEffort: v })}
          />
        </div>
      ),
    },
    {
      title: "Are you pregnant, trying, or breastfeeding?",
      subtitle: "Only used to flag ingredients (like retinoids) that are usually avoided — always check with your doctor.",
      done: () => true,
      render: () => (
        <div className="space-y-2.5">
          <OptionCard title="Yes" selected={q.pregnant === true} onClick={() => set({ pregnant: true })} />
          <OptionCard title="No / prefer not to say" selected={q.pregnant === false} onClick={() => set({ pregnant: false })} />
        </div>
      ),
    },
  ];

  if (!ready) return null;
  const cur = questions[i];
  const next = () => {
    if (i < questions.length - 1) setI(i + 1);
    else router.push("/start/products");
  };

  return (
    <div className="space-y-8">
      <div key={i} className="pm-fade-up">
        <Eyebrow>
          Step 2 · Question {i + 1} of {questions.length + 1}
        </Eyebrow>
        <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">{cur.title}</h1>
        {cur.subtitle && <p className="mt-2 text-muted">{cur.subtitle}</p>}
        <div className="mt-7">{cur.render()}</div>
      </div>
      <div className="flex items-center justify-between border-t border-line pt-6">
        <Button variant="ghost" onClick={() => (i ? setI(i - 1) : router.push("/start/photo"))}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          {!cur.done(q) && (
            <button type="button" className="px-3 text-sm text-muted hover:text-ink" onClick={next}>
              Skip
            </button>
          )}
          <Button onClick={next} disabled={!cur.done(q)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function YesNo({ label, value, onChange }: { label: string; value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <p className="mb-2.5 font-medium">{label}</p>
      <div className="flex gap-2">
        <Chip selected={value === true} onClick={() => onChange(true)}>
          Yes
        </Chip>
        <Chip selected={value === false} onClick={() => onChange(false)}>
          No
        </Chip>
      </div>
    </div>
  );
}

function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-2.5 font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <Chip key={v} selected={value === v} onClick={() => onChange(v)}>
            {l}
          </Chip>
        ))}
      </div>
    </div>
  );
}
