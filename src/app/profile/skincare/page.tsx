"use client";

import { useMemo, useState } from "react";
import { EvidenceBadge, EvidenceNote, ScienceLink, Sources } from "@/components/Evidence";
import { useProfile } from "@/components/ProfileProvider";
import { Badge, Card, Eyebrow, H2, Notice } from "@/components/ui";
import { PRACTICE } from "@/lib/evidence";
import { FAMILY_LABEL, familiesToAvoid, personalSignals } from "@/lib/ingredients";
import { buildRoutine, lookFor, type ActiveAdvice, type Pick } from "@/lib/skincare";

const CONCERN = (c: string) => (c === "sensitive" ? "sensitive skin" : c.replace("-", " "));

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
    <div className="space-y-10">
      <div>
        <Eyebrow>Skincare</Eyebrow>
        <H2 as="h1" className="mt-2">A routine built on evidence, fitted to your skin.</H2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Every recommendation is ranked by how strong the published evidence is for <em>your</em> concerns —
          clinical guidelines and randomized trials first, promising-but-unproven ingredients last. Each one links to
          its sources. <ScienceLink className="text-ink" />
        </p>
      </div>

      <section>
        <h2 className="font-display text-2xl">What the evidence says works for you</h2>
        {look.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {look.slice(0, 8).map((a) => (
              <ActiveCard key={a.active} advice={a} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Choose the concerns you want to work on in the quiz to see this.</p>
        )}
      </section>

      {avoid.length > 0 && (
        <Card>
          <p className="font-medium">We&apos;re steering you away from</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {avoid.map((f) => (
              <Badge key={f} tone="bad">
                {FAMILY_LABEL[f]}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Based on your quiz answers and the products you&apos;ve logged — see the Ingredients tab for why.</p>
        </Card>
      )}

      <Card className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="font-medium">Before anything new: a use test</p>
          <EvidenceNote className="mt-3" {...PRACTICE.patchTest} />
        </div>
        <div>
          <p className="font-medium">One change at a time</p>
          <EvidenceNote className="mt-3" {...PRACTICE.oneAtATime} />
        </div>
      </Card>

      {groups.map((g) => (
        <section key={g.when}>
          <h2 className="mb-3 font-display text-2xl">{g.when}</h2>
          <ol className="space-y-3">
            {g.steps.map((s, i) =>
              g.when === "Evening" && s.when === "AM & PM" ? (
                <li key={`${g.when}-${s.title}`}>
                  <Card className="flex items-baseline gap-3 p-4 sm:p-5">
                    <span className="font-display text-xl text-accent">{i + 1}</span>
                    <p className="flex-1">
                      <span className="font-medium">{s.title}</span>
                      <span className="text-sm text-muted">
                        {" "}
                        — same as morning ({s.picks[0].item.brand} {s.picks[0].item.name})
                      </span>
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
                    {s.note && <EvidenceNote className="mt-3" {...s.note} />}
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                      {s.picks.map((p, j) => (
                        <PickCard key={p.item.id} pick={p} label={p.liked ? "Already a favourite" : j === 0 ? "Best fit" : "Alternative"} />
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
        Ingredients tab) before you buy. This is cosmetic guidance, not medical advice: for acne, rosacea, eczema or
        pigmentation that doesn&apos;t improve in 8–12 weeks, a dermatologist can prescribe options that are more
        effective than anything over the counter.
      </Notice>
    </div>
  );
}

function ActiveCard({ advice }: { advice: ActiveAdvice }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <Card className="h-full p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-medium">{advice.name}</p>
          <EvidenceBadge level={advice.level} />
        </div>
        <p className="mt-1 text-sm text-muted">{advice.how}</p>
        <p className="mt-2 text-xs text-faint">For your {advice.claims.map((c) => CONCERN(c.concern)).join(", ")}</p>
        {advice.rxOnly && <p className="mt-2 text-xs text-accent">Prescription only — worth asking a dermatologist about.</p>}
        <button type="button" onClick={() => setOpen(!open)} className="mt-3 text-xs underline underline-offset-2" aria-expanded={open}>
          {open ? "Hide the evidence" : "What's the evidence?"}
        </button>
        {open && (
          <ul className="mt-3 space-y-2">
            {advice.claims.map((c) => (
              <li key={c.concern} className="rounded-xl bg-canvas px-3.5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium capitalize">{CONCERN(c.concern)}</span>
                  <EvidenceBadge level={c.level} />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{c.summary}</p>
                <Sources ids={c.sources} className="mt-1" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </li>
  );
}

function PickCard({ pick: p, label }: { pick: Pick; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-2xl bg-canvas p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
          <p className="mt-1 font-medium">{p.item.brand}</p>
          <p className="text-sm">{p.item.name}</p>
        </div>
        <span className="whitespace-nowrap text-sm text-muted">≈ ${p.item.price}</span>
      </div>
      <p className="mt-2 text-xs text-muted">{p.item.keyIngredients.join(" · ")}</p>
      {p.evidence[0] && <EvidenceBadge level={p.evidence[0].level} className="mt-2" />}
      {p.why.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-good">
          {p.why.slice(0, 3).map((w) => (
            <li key={w}>✓ {w}</li>
          ))}
        </ul>
      )}
      {p.item.note && <p className="mt-1.5 text-xs text-muted">{p.item.note}</p>}
      {p.caution && <p className="mt-1 text-xs text-warn">! {p.caution}</p>}
      {p.evidence.length > 0 && (
        <>
          <button type="button" onClick={() => setOpen(!open)} className="mt-2 text-xs underline underline-offset-2" aria-expanded={open}>
            {open ? "Hide sources" : "Why this works"}
          </button>
          {open && (
            <ul className="mt-2 space-y-2">
              {p.evidence.map((c) => (
                <li key={`${c.active}-${c.concern}`} className="text-xs leading-relaxed">
                  <span className="text-ink/80">{c.summary}</span>
                  <Sources ids={c.sources} className="mt-0.5" />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}
