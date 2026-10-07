"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BudgetSliders } from "@/components/BudgetSliders";
import { Disclaimer } from "@/components/Disclaimer";
import { concernLabel } from "@/components/PhotoAnalyzer";
import { useProfile } from "@/components/ProfileProvider";
import { Badge, Button, ButtonLink, Card, Eyebrow, H2, Meter, Notice, Swatch } from "@/components/ui";
import { matchLabel, TIER_LABEL } from "@/lib/foundations";
import { personalSignals } from "@/lib/ingredients";
import { profileStrength } from "@/lib/learning";
import { topFoundations } from "@/lib/recommend";
import { buildRoutine } from "@/lib/skincare";

export default function Overview() {
  const { profile, update, model, db, reset } = useProfile();
  const [editBudget, setEditBudget] = useState(false);
  const strength = profileStrength(profile);
  const top = useMemo(() => (db ? topFoundations(profile, model, db).slice(0, 3) : []), [profile, model, db]);
  const routine = useMemo(() => buildRoutine(profile, model.depth), [profile, model.depth]);
  const signals = useMemo(() => personalSignals(profile), [profile]);
  const q = profile.quiz;
  const liked = profile.products.filter((p) => p.verdict === "liked").length;
  const disliked = profile.products.filter((p) => p.verdict === "disliked").length;
  const concerns = [...new Set([...q.concerns, ...(profile.photo?.concerns ?? []).filter((c) => c.confidence !== "low" && c.score >= 0.5).map((c) => c.key)])];

  const exportData = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "perfectmatch-profile.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <Swatch hex={model.hex} size={96} />
        <div className="flex-1">
          <Eyebrow>Your skin profile</Eyebrow>
          <h1 className="mt-2 font-display text-4xl capitalize tracking-tight sm:text-5xl">
            {model.depth.replace("-", " ")} · {model.undertone}
          </h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {q.skinType && <Badge>{q.skinType} skin</Badge>}
            {q.sensitivity && q.sensitivity !== "not" && <Badge tone="warn">{q.sensitivity === "very" ? "very sensitive" : "somewhat sensitive"}</Badge>}
            {q.acneProne && <Badge tone="warn">breakout-prone</Badge>}
            {q.avoidFragrance && <Badge>fragrance-free</Badge>}
            {concerns.map((c) => (
              <Badge key={c} tone="accent">
                {concernLabel(c)}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="flex items-baseline justify-between">
            <p className="font-medium">Match confidence</p>
            <p className="font-display text-3xl">{strength.score}%</p>
          </div>
          <Meter value={strength.score} className="mt-3" />
          <p className="mt-2 text-sm text-muted">{strength.label}</p>
          {strength.tips.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              {strength.tips.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-accent">→</span>
                  {t}
                </li>
              ))}
            </ul>
          )}
          <ButtonLink href="/profile/products" variant="secondary" className="mt-5">
            Log a product
          </ButtonLink>
        </Card>
        <Disclaimer compact className="h-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/profile/foundation" className="group">
          <Card className="h-full transition group-hover:border-ink/40">
            <Eyebrow>Top foundation match</Eyebrow>
            {top[0] ? (
              <div className="mt-4 flex items-center gap-3">
                <Swatch hex={top[0].shade.hex} size={44} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{top[0].product.brand}</p>
                  <p className="truncate text-sm text-muted">
                    {top[0].product.name} · {top[0].shade.label}
                  </p>
                  <p className="mt-1 text-xs text-accent">
                    {matchLabel(top[0].deltaE)} · {TIER_LABEL[top[0].product.tier]}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">Loading shade library…</p>
            )}
          </Card>
        </Link>
        <Link href="/profile/skincare" className="group">
          <Card className="h-full transition group-hover:border-ink/40">
            <Eyebrow>Your routine</Eyebrow>
            <p className="mt-4 font-display text-3xl">{routine.length} steps</p>
            <p className="mt-1 text-sm text-muted">{routine.map((s) => s.title.split(" (")[0]).join(" · ")}</p>
          </Card>
        </Link>
        <Link href="/profile/ingredients" className="group">
          <Card className="h-full transition group-hover:border-ink/40">
            <Eyebrow>Ingredient watch</Eyebrow>
            <p className="mt-4 font-display text-3xl">{signals.length + profile.watchlist.length + q.allergies.length}</p>
            <p className="mt-1 text-sm text-muted">
              {signals.length ? `${signals.length} learned from your products` : "We'll learn patterns as you log products with ingredients"}
            </p>
          </Card>
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <H2 className="text-xl sm:text-2xl">How we found your shade</H2>
          <p className="mt-1 text-sm text-muted">Shades you&apos;ve worn count for more than the photo.</p>
          <ul className="mt-4 space-y-3">
            {model.colorEvidence.map((e, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                {e.hex && <Swatch hex={e.hex} size={28} />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.label}</p>
                  {e.detail && <p className="truncate text-muted">{e.detail}</p>}
                </div>
                <span className="text-xs text-faint">×{e.weight.toFixed(1)}</span>
              </li>
            ))}
            {!model.colorEvidence.length && <li className="text-sm text-muted">No colour info yet — add a photo or answer the depth question.</li>}
          </ul>
        </Card>
        <Card>
          <H2 className="text-xl sm:text-2xl">Undertone clues</H2>
          <p className="mt-1 text-sm text-muted">
            Leaning <span className="font-medium text-ink">{model.undertone}</span>.
          </p>
          <div className="relative mt-5 h-2 rounded-full bg-gradient-to-r from-[#e7b4b4] via-[#e9c8a8] to-[#e8c27a]">
            <span
              className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-ink bg-surface"
              style={{ left: `${((model.undertoneAxis + 1) / 2) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-faint">
            <span>Cool</span>
            <span>Neutral</span>
            <span>Warm</span>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm">
            {model.undertoneEvidence.map((e, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  {e.label}
                  {e.detail && <span className="text-muted"> — {e.detail}</span>}
                </span>
                <span className="text-xs text-faint">×{e.weight.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {profile.photo?.ai && (
        <Card>
          <Eyebrow>AI read of your photo</Eyebrow>
          <p className="mt-3 leading-relaxed">{profile.photo.ai.summary}</p>
        </Card>
      )}

      <section>
        <H2 className="text-xl sm:text-2xl">Settings</H2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between">
              <p className="font-medium">Budget &amp; quality</p>
              <button type="button" className="text-sm underline underline-offset-4" onClick={() => setEditBudget(!editBudget)}>
                {editBudget ? "Done" : "Adjust"}
              </button>
            </div>
            {editBudget ? (
              <div className="mt-5">
                <BudgetSliders value={profile.preferences} onChange={(preferences) => update((p) => ({ ...p, preferences }))} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Around ${profile.preferences.budget} per product · performance priority {profile.preferences.quality}/100
              </p>
            )}
          </Card>
          <Card className="space-y-3">
            <p className="font-medium">Your data</p>
            <p className="text-sm text-muted">
              {liked} liked · {disliked} disliked · {profile.products.length} products logged
            </p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/start/photo" variant="secondary">
                Retake photo
              </ButtonLink>
              <ButtonLink href="/start/quiz" variant="secondary">
                Redo quiz
              </ButtonLink>
              <Button variant="secondary" onClick={exportData}>
                Export
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm("Erase your whole profile, including every logged product? This can't be undone.")) reset();
                }}
              >
                Start over
              </Button>
            </div>
          </Card>
        </div>
        {profile.photo && profile.photo.warnings.length > 0 && (
          <Notice tone="warn" className="mt-4">
            Your photo had tricky lighting ({profile.photo.warnings[0].toLowerCase()}) A retake in daylight will sharpen
            your match.
          </Notice>
        )}
      </section>
    </div>
  );
}
